const Borrowing = require("../models/Borrowing");
const Equipment = require("../models/Equipment");
const Borrower = require("../models/Borrower");
const Fine = require("../models/Fine");
const User = require("../models/User"); // <-- Added User model to translate IDs
const httpError = require("../utils/httpError");
const { computeDueDate, daysOverdue } = require("../utils/dates");
const {
  FACULTY_LOAN_MULTIPLIER,
  getAvailability,
  computeFee,
  getStanding,
} = require("../utils/rules");

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
  const days = borrowing.status === "active" ? daysOverdue(borrowing.dueDate) : 0;
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

  const borrowDate = new Date();
  let dueDate = null;
  
  if (equipment.type === "non-consumable") {
    dueDate = new Date();
    
    // If they selected tomorrow, push the due date forward by 1 day
    if (schedule === "tomorrow") {
      dueDate.setDate(dueDate.getDate() + 1);
    }
    
    // Set the due date to exactly 9:00 PM (21:00:00 local time) on the chosen day
    dueDate.setHours(21, 0, 0, 0);
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
    borrowing.quantity = req.body.quantity;
  }
  if (req.body.purpose !== undefined) borrowing.purpose = req.body.purpose;

  await borrowing.save();
  res.json(borrowing);
}

// PROCESSING: PATCH /api/borrowings/:id/status - custom pipeline
async function changeBorrowingStatus(req, res) {
  const newStatus = req.body.status;
  const borrowing = await findBorrowing(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");
  if (!newStatus) throw httpError(400, "Status is required");

  const equipment = borrowing.equipment;
  if (!equipment) throw httpError(400, "The equipment for this borrowing no longer exists");

  const flow = {
    in_review: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["active", "cancelled"],
    active: ["returned", "overdue"],
    overdue: ["returned"],
    returned: [],
    cancelled: []
  };

  const allowed = flow[borrowing.status] || [];
  if (!allowed.includes(newStatus)) {
    const hint = allowed.length ? `Allowed: ${allowed.join(" or ")}` : "This borrowing is final";
    throw httpError(400, `Cannot change status from ${borrowing.status} to ${newStatus}. ${hint}`);
  }

  let fine = null;

  if (newStatus === "ready_for_pickup") {
    const { available } = await getAvailability(equipment);
    if (borrowing.quantity > available) {
      throw httpError(400, `Cannot approve: only ${available} unit(s) available`);
    }
  }

  if (newStatus === "active") {
    borrowing.releasedAt = new Date();
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
  await borrowing.save();

  res.json({ message: `Borrowing updated to ${newStatus.replace(/_/g, ' ')}`, borrowing: withOverdue(borrowing), fine });
}

// DELETE /api/borrowings/:id - delete a borrowing
async function deleteBorrowing(req, res) {
  const borrowing = await Borrowing.findById(req.params.id);
  if (!borrowing) throw httpError(404, "Borrowing not found");

  if (["ready_for_pickup", "active"].includes(borrowing.status)) {
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