const Borrowing = require("../models/Borrowing");
const Equipment = require("../models/Equipment");
const Borrower = require("../models/Borrower");
const Fine = require("../models/Fine");
const httpError = require("../utils/httpError");
const { computeDueDate, daysOverdue } = require("../utils/dates");
const {
  nextStatuses,
  FACULTY_LOAN_MULTIPLIER,
  getAvailability,
  computeFee,
  getStanding,
} = require("../utils/rules");

// Loads a borrowing together with its equipment (and category) and borrower.
function findBorrowing(id) {
  return Borrowing.findById(id)
    .populate({ path: "equipment", populate: { path: "category" } })
    .populate("borrower");
}

// Adds the computed "daysOverdue" value. Only released items can be overdue.
function withOverdue(borrowing) {
  const days = borrowing.status === "released" ? daysOverdue(borrowing.dueDate) : 0;
  return { ...borrowing.toObject(), daysOverdue: days };
}

// GET /api/borrowings?status=&borrower=&equipment= - list all borrowings
async function getBorrowings(req, res) {
  const { status, borrower, equipment } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (borrower) filter.borrower = borrower;
  if (equipment) filter.equipment = equipment;

  const borrowings = await Borrowing.find(filter)
    .populate({ path: "equipment", populate: { path: "category" } })
    .populate("borrower")
    .sort("-createdAt");

  res.json(borrowings.map(withOverdue));
}

// PROCESSING: GET /api/borrowings/overdue
// Released items that are past their due date, with days overdue and the running fee.
// (Defined before "/:id" so that "overdue" is not read as an ID.)
async function getOverdueBorrowings(req, res) {
  const released = await Borrowing.find({ status: "released", dueDate: { $lt: new Date() } })
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
// Checks the borrower's standing and the availability, then computes the due date.
async function createBorrowing(req, res) {
  const { equipment: equipmentId, borrower: borrowerId, purpose } = req.body;
  const quantity = Number(req.body.quantity);

  if (!equipmentId) throw httpError(400, "Equipment is required");
  if (!borrowerId) throw httpError(400, "Borrower is required");
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw httpError(400, "Quantity must be a whole number of at least 1");
  }

  const equipment = await Equipment.findById(equipmentId).populate("category");
  if (!equipment) throw httpError(404, "Equipment not found");
  const borrower = await Borrower.findById(borrowerId);
  if (!borrower) throw httpError(404, "Borrower not found");

  // Rule 1: a blocked borrower cannot borrow.
  const standing = await getStanding(borrower);
  if (standing.blocked) {
    throw httpError(400, `Borrower is blocked: ${standing.reasons.join("; ")}`);
  }

  // Rule 2: the request cannot exceed the available units.
  const { available, usable } = await getAvailability(equipment);
  if (!usable) throw httpError(400, `Equipment is ${equipment.condition} and cannot be borrowed`);
  if (quantity > available) {
    throw httpError(400, `Only ${available} unit(s) of ${equipment.name} available`);
  }

  // Rule 3: the due date is computed by the server, never sent by the client.
  // Consumables are not returned, so they have no due date.
  const borrowDate = new Date();
  let dueDate = null;
  if (equipment.type === "non-consumable") {
    const multiplier = borrower.type === "faculty" ? FACULTY_LOAN_MULTIPLIER : 1;
    dueDate = computeDueDate(borrowDate, equipment.category.maxLoanDays * multiplier);
  }

  const borrowing = await Borrowing.create({
    equipment: equipment._id,
    borrower: borrower._id,
    quantity,
    purpose,
    borrowDate,
    dueDate,
  });

  res.status(201).json(borrowing);
}

// PUT /api/borrowings/:id - update quantity or purpose
// Rule: only a pending borrowing can be edited. Status changes go through PATCH.
async function updateBorrowing(req, res) {
  const borrowing = await findBorrowing(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");
  if (borrowing.status !== "pending") {
    throw httpError(400, `This borrowing is already ${borrowing.status} and can no longer be edited`);
  }

  if (req.body.quantity !== undefined) {
    const { available } = await getAvailability(borrowing.equipment);
    if (Number(req.body.quantity) > available) {
      throw httpError(400, `Only ${available} unit(s) available`);
    }
    borrowing.quantity = req.body.quantity;
  }
  if (req.body.purpose !== undefined) borrowing.purpose = req.body.purpose;

  await borrowing.save(); // save() runs the schema validation
  res.json(borrowing);
}

// PROCESSING: PATCH /api/borrowings/:id/status - rule-based status change
// non-consumable: pending -> approved -> released -> returned
// consumable:     pending -> approved -> issued
// Either kind may be cancelled before it is handed over.
async function changeBorrowingStatus(req, res) {
  const newStatus = req.body.status;
  const borrowing = await findBorrowing(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");
  if (!newStatus) throw httpError(400, "Status is required");

  const equipment = borrowing.equipment;
  if (!equipment) throw httpError(400, "The equipment for this borrowing no longer exists");

  // Rule 1: only the next allowed status is accepted. No skipping, no going back.
  const allowed = nextStatuses(borrowing.status, equipment.type);
  if (!allowed.includes(newStatus)) {
    const hint = allowed.length ? `Allowed: ${allowed.join(" or ")}` : "This borrowing is final";
    throw httpError(400, `Cannot change status from ${borrowing.status} to ${newStatus}. ${hint}`);
  }

  let fine = null;

  if (newStatus === "approved") {
    // Rule 2: availability is checked again, because other requests
    // may have been approved since this one was created.
    const { available } = await getAvailability(equipment);
    if (borrowing.quantity > available) {
      throw httpError(400, `Cannot approve: only ${available} unit(s) available`);
    }
  }

  if (newStatus === "released") {
    borrowing.releasedAt = new Date();
  }

  if (newStatus === "issued") {
    // Rule 3: issuing a consumable deducts it from stock for good.
    if (equipment.totalQuantity < borrowing.quantity) {
      throw httpError(400, `Cannot issue: only ${equipment.totalQuantity} left in stock`);
    }
    equipment.totalQuantity -= borrowing.quantity;
    await equipment.save();
    borrowing.releasedAt = new Date();
  }

  if (newStatus === "returned") {
    borrowing.returnDate = new Date();

    // Rule 4: a late return creates a fine automatically.
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
  await borrowing.save();

  res.json({ message: `Borrowing ${newStatus}`, borrowing: withOverdue(borrowing), fine });
}

// DELETE /api/borrowings/:id - delete a borrowing
// Rule: approved or released borrowings hold units, so they cannot be deleted.
async function deleteBorrowing(req, res) {
  const borrowing = await Borrowing.findById(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");

  if (["approved", "released"].includes(borrowing.status)) {
    throw httpError(400, `Cannot delete a borrowing that is ${borrowing.status}`);
  }
  const unpaid = await Fine.countDocuments({ borrowing: borrowing._id, status: "unpaid" });
  if (unpaid > 0) throw httpError(400, "Cannot delete: this borrowing has an unpaid fine");

  await borrowing.deleteOne();
  res.json({ message: "Borrowing deleted" });
}

module.exports = {
  getBorrowings,
  getOverdueBorrowings,
  getBorrowingById,
  createBorrowing,
  updateBorrowing,
  changeBorrowingStatus,
  deleteBorrowing,
};
