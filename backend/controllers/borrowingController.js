const mongoose = require("mongoose");
const Borrowing = require("../models/Borrowing");
const Equipment = require("../models/Equipment");
const Borrower = require("../models/Borrower");
const Fine = require("../models/Fine");
const User = require("../models/User"); // <-- Added User model to translate IDs
const httpError = require("../utils/httpError");
const { computeDueDate, daysOverdue } = require("../utils/dates");
const {
  nextStatuses,
  getAvailability,
  computeFee,
  getStanding,
  checkLoanLimit,
} = require("../utils/rules");

// Rounds money to centavos, for example 12.345 -> 12.35
const roundMoney = (amount) => Math.round(amount * 100) / 100;

// --- NEW HELPER: Translates frontend User IDs into database Borrower IDs ---
async function resolveBorrowerId(providedId) {
  try {
    const userAccount = await User.findById(providedId);
    if (userAccount) {
      const profile = await Borrower.findOne({ email: userAccount.email });
      return profile ? profile._id : providedId;
    }
  } catch (err) {
    // If it fails to cast, it's likely already a standard Borrower ID, so just ignore
  }
  return providedId;
}
// --------------------------------------------------------------------------

function findBorrowing(id) {
  return Borrowing.findById(id)
    .populate({ path: "equipment", populate: { path: "category" } })
    .populate("borrower");
}

function withOverdue(borrowing) {
  const days = ["active", "overdue"].includes(borrowing.status) ? daysOverdue(borrowing.dueDate) : 0;
  return { ...borrowing.toObject(), daysOverdue: days };
}

// GET /api/borrowings?status=&borrower=&equipment= - list all borrowings
async function getBorrowings(req, res) {
  const { status, borrower, equipment } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (equipment) filter.equipment = equipment;
  
  if (borrower) {
    // Automatically translate the ID from the frontend
    filter.borrower = await resolveBorrowerId(borrower);
  }

  const borrowings = await Borrowing.find(filter)
    .populate({ path: "equipment", populate: { path: "category" } })
    .populate("borrower")
    .sort("-createdAt");

  res.json(borrowings.map(withOverdue));
}

// PROCESSING: GET /api/borrowings/overdue
async function getOverdueBorrowings(req, res) {
  const released = await Borrowing.find({ status: "active", dueDate: { $lt: new Date() } })
    .populate({ path: "equipment", populate: { path: "category" } })
    .populate("borrower")
    .sort("dueDate");

  const overdue = released.map((b) => {
    const days = daysOverdue(b.dueDate);
    const dailyFee = b.equipment?.category?.dailyFee ?? 0;
    const runningFee = computeFee(days, dailyFee, b.quantity, b.equipment?.replacementCost ?? 0);
    return { ...b.toObject(), daysOverdue: days, dailyFee, runningFee };
  });

  res.json(overdue);
}

// GET /api/borrowings/:id - get one borrowing
async function getBorrowingById(req, res) {
  const borrowing = await findBorrowing(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");
  res.json(withOverdue(borrowing));
}

// PROCESSING: POST /api/borrowings - create a borrowing request
async function createBorrowing(req, res) {
  // Grab the schedule choice (defaulting to 'today' if not provided)
  const { equipment: equipmentId, borrower: rawBorrowerId, purpose, schedule = "today" } = req.body;
  const quantity = Number(req.body.quantity);

  if (!equipmentId) throw httpError(400, "Equipment is required");
  if (!rawBorrowerId) throw httpError(400, "Borrower is required");
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw httpError(400, "Quantity must be a whole number of at least 1");
  }

  // Automatically translate the ID from the frontend's cart
  const actualBorrowerId = await resolveBorrowerId(rawBorrowerId);

  const equipment = await Equipment.findById(equipmentId).populate("category");
  if (!equipment) throw httpError(404, "Equipment not found");
  
  const borrower = await Borrower.findById(actualBorrowerId);
  if (!borrower) throw httpError(404, "Borrower profile not found");

  const standing = await getStanding(borrower);
  if (standing.blocked) {
    throw httpError(400, `Borrower is blocked: ${standing.reasons.join("; ")}`);
  }

  const { available, usable } = await getAvailability(equipment);
  if (!usable) throw httpError(400, `Equipment is ${equipment.condition} and cannot be borrowed`);
  if (quantity > available) {
    throw httpError(400, `Only ${available} unit(s) of ${equipment.name} available`);
  }

  // Non-consumables: at most 2 requested or borrowed at a time. Consumables have no limit.
  if (equipment.type !== "consumable") {
    await checkLoanLimit(borrower._id, quantity);
  }

  const borrowing = await Borrowing.create({
    ...bookingFields({ equipment, borrower, quantity, purpose, schedule, borrowDate: new Date() }),
    bookingId: new mongoose.Types.ObjectId().toString(), // a booking with a single item
  });

  res.status(201).json(borrowing);
}

// Builds the stored fields for one booked item.
// - Non-consumables are due at 9:00 PM on the pickup day (today, or tomorrow if chosen).
// - Consumables are bought, not borrowed: no due date, and the price is recorded for pickup.
function bookingFields({ equipment, borrower, quantity, purpose = "", schedule = "today", borrowDate }) {
  let dueDate = null;
  if (equipment.type !== "consumable") {
    dueDate = new Date(borrowDate);
    if (schedule === "tomorrow") dueDate.setDate(dueDate.getDate() + 1);
    dueDate.setHours(21, 0, 0, 0);
  }

  const unitPrice = equipment.type === "consumable" ? equipment.costPerUnit || 0 : 0;

  return {
    equipment: equipment._id,
    borrower: borrower._id,
    quantity,
    purpose,
    borrowDate,
    dueDate,
    unitPrice,
    totalPrice: roundMoney(unitPrice * quantity),
  };
}

// PROCESSING: POST /api/borrowings/batch - book several different items for one borrower at once
// Body: { borrower, items: [{ equipment, quantity }], purpose, schedule }
// Every item is checked first, and nothing is saved unless all of them pass.
// The 2-item limit counts every non-consumable in the booking plus what the borrower already has.
async function createBorrowingBatch(req, res) {
  const { borrower: rawBorrowerId, items, purpose = "", schedule = "today" } = req.body;
  if (!rawBorrowerId) throw httpError(400, "Borrower is required");
  if (!Array.isArray(items) || items.length === 0) throw httpError(400, "Add at least one item");

  const borrower = await Borrower.findById(await resolveBorrowerId(rawBorrowerId));
  if (!borrower) throw httpError(404, "Borrower profile not found");

  const standing = await getStanding(borrower);
  if (standing.blocked) {
    throw httpError(400, `Borrower is blocked: ${standing.reasons.join("; ")}`);
  }

  // 1. Check every row before saving anything.
  const checked = [];
  const seen = new Set();
  for (const [index, row] of items.entries()) {
    const label = `Item ${index + 1}`;
    if (!row || !row.equipment) throw httpError(400, `${label}: select an item`);
    if (seen.has(String(row.equipment))) throw httpError(400, `${label}: this item is already in the booking`);
    seen.add(String(row.equipment));

    const quantity = Number(row.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw httpError(400, `${label}: quantity must be a whole number of at least 1`);
    }

    const equipment = await Equipment.findById(row.equipment);
    if (!equipment) throw httpError(404, `${label}: equipment not found`);

    const { available, usable } = await getAvailability(equipment);
    if (!usable) throw httpError(400, `${equipment.name} is ${equipment.condition} and cannot be borrowed`);
    if (quantity > available) throw httpError(400, `Only ${available} unit(s) of ${equipment.name} available`);

    checked.push({ equipment, quantity });
  }

  // 2. Non-consumables: at most 2 at a time across the whole booking. Consumables have no limit.
  const loanUnits = checked
    .filter(({ equipment }) => equipment.type !== "consumable")
    .reduce((sum, { quantity }) => sum + quantity, 0);
  if (loanUnits > 0) await checkLoanLimit(borrower._id, loanUnits);

  // 3. Everything passed: save all the items under one booking id.
  const borrowDate = new Date();
  const bookingId = new mongoose.Types.ObjectId().toString();
  const created = await Borrowing.insertMany(
    checked.map(({ equipment, quantity }) => ({
      ...bookingFields({ equipment, borrower, quantity, purpose, schedule, borrowDate }),
      bookingId,
    }))
  );

  res.status(201).json(created);
}

// PUT /api/borrowings/:id - update quantity or purpose
async function updateBorrowing(req, res) {
  const borrowing = await findBorrowing(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");
  if (borrowing.status !== "in_review") {
    throw httpError(400, `This borrowing is already ${borrowing.status} and can no longer be edited`);
  }

  if (req.body.quantity !== undefined) {
    const { available } = await getAvailability(borrowing.equipment);
    if (Number(req.body.quantity) > available) {
      throw httpError(400, `Only ${available} unit(s) available`);
    }
    if (borrowing.equipment.type !== "consumable") {
      await checkLoanLimit(borrowing.borrower._id, Number(req.body.quantity), borrowing._id);
    }
    borrowing.quantity = req.body.quantity;
    borrowing.totalPrice = roundMoney(borrowing.unitPrice * borrowing.quantity);
  }
  if (req.body.purpose !== undefined) borrowing.purpose = req.body.purpose;

  await borrowing.save();
  res.json(borrowing);
}

// Moves one item to a new status and applies what that step means:
// - ready_for_pickup: units must still be available
// - active: the loan starts (handed over)
// - purchased: cash collected, stock goes down for good
// - returned: a fine is created if it came back late
// Returns the fine (or null). Throws a 400 error if the step is not allowed.
async function applyStatusChange(borrowing, newStatus) {
  const equipment = borrowing.equipment;
  if (!equipment) throw httpError(400, "The equipment for this booking no longer exists");

  // Loans and purchases follow different paths (see nextStatuses in utils/rules.js).
  const allowed = nextStatuses(borrowing.status, equipment.type);
  if (!allowed.includes(newStatus)) {
    const hint = allowed.length ? `Allowed: ${allowed.join(" or ")}` : "This item is final";
    throw httpError(400, `${equipment.name}: cannot change status from ${borrowing.status} to ${newStatus}. ${hint}`);
  }

  let fine = null;

  if (newStatus === "ready_for_pickup") {
    const { available } = await getAvailability(equipment);
    if (borrowing.quantity > available) {
      throw httpError(400, `Cannot approve ${equipment.name}: only ${available} unit(s) available`);
    }
  }

  if (newStatus === "active") {
    borrowing.releasedAt = new Date();
  }

  // A consumable is paid for in cash and handed over. It is used up, so the stock goes down
  // for good. The update only succeeds if enough stock is left, so two sales cannot both take
  // the last unit.
  let stockDeducted = false;
  if (newStatus === "purchased") {
    const updated = await Equipment.findOneAndUpdate(
      { _id: equipment._id, totalQuantity: { $gte: borrowing.quantity } },
      { $inc: { totalQuantity: -borrowing.quantity } },
      { new: true }
    );
    if (!updated) {
      throw httpError(400, `Cannot complete the sale: only ${equipment.totalQuantity} unit(s) of ${equipment.name} in stock`);
    }
    stockDeducted = true;

    // Requests made before prices existed have no price yet, so use the item's current price.
    if (!borrowing.unitPrice) borrowing.unitPrice = equipment.costPerUnit || 0;
    borrowing.totalPrice = roundMoney(borrowing.unitPrice * borrowing.quantity);
    borrowing.purchasedAt = new Date();
    if (!borrowing.releasedAt) borrowing.releasedAt = borrowing.purchasedAt;
  }

  if (newStatus === "returned") {
    borrowing.returnDate = new Date();

    const days = daysOverdue(borrowing.dueDate, borrowing.returnDate);
    if (days > 0) {
      const dailyFee = equipment.category?.dailyFee ?? 0;
      const amount = computeFee(days, dailyFee, borrowing.quantity, equipment.replacementCost);
      fine = await Fine.create({
        borrowing: borrowing._id,
        borrower: borrowing.borrower._id,
        daysOverdue: days,
        amount,
      });
    }
  }

  borrowing.status = newStatus;
  try {
    await borrowing.save();
  } catch (error) {
    // Put the stock back if the sale could not be saved.
    if (stockDeducted) {
      await Equipment.updateOne({ _id: equipment._id }, { $inc: { totalQuantity: borrowing.quantity } });
    }
    throw error;
  }

  return fine;
}

// PROCESSING: PATCH /api/borrowings/:id/status - move ONE item (used for returning items one at a time)
async function changeBorrowingStatus(req, res) {
  const newStatus = req.body.status;
  const borrowing = await findBorrowing(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");
  if (!newStatus) throw httpError(400, "Status is required");

  const fine = await applyStatusChange(borrowing, newStatus);

  const message =
    newStatus === "purchased"
      ? `Sale recorded: PHP ${borrowing.totalPrice} paid in cash`
      : `Item updated to ${newStatus.replace(/_/g, " ")}`;
  res.json({ message, borrowing: withOverdue(borrowing), fine });
}

// DELETE /api/borrowings/:id - delete one item
async function deleteBorrowing(req, res) {
  const borrowing = await Borrowing.findById(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");

  if (["ready_for_pickup", "active", "overdue"].includes(borrowing.status)) {
    throw httpError(400, `Cannot delete an item that is ${borrowing.status.replace(/_/g, " ")}`);
  }
  const unpaid = await Fine.countDocuments({ borrowing: borrowing._id, status: "unpaid" });
  if (unpaid > 0) throw httpError(400, "Cannot delete: this item has an unpaid fine");

  await borrowing.deleteOne();
  res.json({ message: "Borrowing deleted" });
}

// ---------- Whole bookings (all items checked out together) ----------

// All items in one booking. Older items without a bookingId are a booking of their own,
// so their own _id works as the booking id.
function findBookingItems(bookingId) {
  const match = [{ bookingId }];
  if (mongoose.isValidObjectId(bookingId)) match.push({ _id: bookingId, bookingId: null });
  return Borrowing.find({ $or: match })
    .populate({ path: "equipment", populate: { path: "category" } })
    .populate("borrower");
}

// What each action does to an item, or null if the action does not apply to it.
// approve:  in review -> ready for pickup
// handover: ready for pickup -> active (loans) or purchased (consumables, cash collected)
// return:   active or overdue loans -> returned
// cancel:   anything not yet handed over -> cancelled
const BOOKING_ACTIONS = {
  approve: (item) => (item.status === "in_review" ? "ready_for_pickup" : null),
  handover: (item) =>
    item.status === "ready_for_pickup" ? (item.equipment?.type === "consumable" ? "purchased" : "active") : null,
  return: (item) =>
    item.equipment?.type !== "consumable" && ["active", "overdue"].includes(item.status) ? "returned" : null,
  cancel: (item) => (["in_review", "ready_for_pickup"].includes(item.status) ? "cancelled" : null),
};

// PROCESSING: PATCH /api/borrowings/bookings/:bookingId/status - move a whole booking at once
// Body: { action: "approve" | "handover" | "return" | "cancel" }
// Every item is checked before any of them is changed.
async function changeBookingStatus(req, res) {
  const { action } = req.body;
  const targetFor = BOOKING_ACTIONS[action];
  if (!targetFor) throw httpError(400, `Unknown action "${action}". Use: ${Object.keys(BOOKING_ACTIONS).join(", ")}`);

  const items = await findBookingItems(req.params.bookingId);
  if (items.length === 0) throw httpError(404, "Booking not found");

  const steps = items.map((item) => ({ item, target: targetFor(item) })).filter((step) => step.target);
  if (steps.length === 0) throw httpError(400, `Nothing in this booking can be changed with "${action}"`);

  // 1. Check every item first.
  for (const { item, target } of steps) {
    if (!item.equipment) throw httpError(400, "An item in this booking no longer exists");
    if (!nextStatuses(item.status, item.equipment.type).includes(target)) {
      throw httpError(400, `${item.equipment.name} cannot go from ${item.status} to ${target}`);
    }
    if (target === "ready_for_pickup") {
      const { available } = await getAvailability(item.equipment);
      if (item.quantity > available) throw httpError(400, `Cannot approve ${item.equipment.name}: only ${available} unit(s) available`);
    }
    if (target === "purchased" && item.equipment.totalQuantity < item.quantity) {
      throw httpError(400, `Cannot complete the sale: only ${item.equipment.totalQuantity} unit(s) of ${item.equipment.name} in stock`);
    }
  }

  // 2. Apply the change to every item.
  const fines = [];
  for (const { item, target } of steps) {
    const fine = await applyStatusChange(item, target);
    if (fine) fines.push(fine);
  }

  const cash = roundMoney(steps.filter((s) => s.target === "purchased").reduce((sum, s) => sum + s.item.totalPrice, 0));
  const messages = {
    approve: "Booking approved and ready for pickup",
    handover: cash > 0 ? `Booking handed over. PHP ${cash} collected in cash` : "Booking handed over",
    return: fines.length ? `Items returned. ${fines.length} late item(s) were fined` : "Items returned",
    cancel: "Booking cancelled",
  };
  res.json({ message: messages[action], items: items.map(withOverdue), fines, cashCollected: cash });
}

// DELETE /api/borrowings/bookings/:bookingId - delete a whole booking
// Rule: not while any item is waiting for pickup or out, and not with an unpaid fine.
async function deleteBooking(req, res) {
  const items = await findBookingItems(req.params.bookingId);
  if (items.length === 0) throw httpError(404, "Booking not found");

  const busy = items.find((item) => ["ready_for_pickup", "active", "overdue"].includes(item.status));
  if (busy) throw httpError(400, `Cannot delete: ${busy.equipment?.name ?? "an item"} is ${busy.status.replace(/_/g, " ")}`);

  const unpaid = await Fine.countDocuments({ borrowing: { $in: items.map((item) => item._id) }, status: "unpaid" });
  if (unpaid > 0) throw httpError(400, "Cannot delete: this booking has an unpaid fine");

  await Borrowing.deleteMany({ _id: { $in: items.map((item) => item._id) } });
  res.json({ message: "Booking deleted" });
}

module.exports = {
  getBorrowings,
  getOverdueBorrowings,
  getBorrowingById,
  createBorrowing,
  createBorrowingBatch,
  updateBorrowing,
  changeBorrowingStatus,
  deleteBorrowing,
  changeBookingStatus,
  deleteBooking,
};