// All business rules are kept in this one file so they are easy to find and explain.
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const { daysOverdue } = require("./dates");

// Custom workflow map
function nextStatuses(currentStatus, equipmentType) {
  const flow = {
    in_review: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["active", "cancelled"],
    active: ["returned", "overdue"],
    overdue: ["returned"],
    returned: [],
    cancelled: []
  };
  return flow[currentStatus] || [];
}

// Statuses that hold units of an item so others can't borrow them
const HOLDING_STATUSES = ["ready_for_pickup", "active", "overdue"];

// Faculty may keep an item twice as long as students.
const FACULTY_LOAN_MULTIPLIER = 2;

// Counts how many units of one equipment are currently held by borrowings.
async function getHeldQuantity(equipment, excludeBorrowingId = null) {
  const filter = {
    equipment: equipment._id,
    status: { $in: HOLDING_STATUSES },
  };
  if (excludeBorrowingId) filter._id = { $ne: excludeBorrowingId };

  const borrowings = await Borrowing.find(filter).select("quantity");
  return borrowings.reduce((sum, b) => sum + b.quantity, 0);
}

// Available units = total quantity - held units (never below zero).
async function getAvailability(equipment, excludeBorrowingId = null) {
  const held = await getHeldQuantity(equipment, excludeBorrowingId);
  const usable = equipment.condition === "good";
  const available = usable ? Math.max(equipment.totalQuantity - held, 0) : 0;
  return { total: equipment.totalQuantity, held, available, usable };
}

// Fee = days overdue x daily fee x quantity, capped at the replacement cost.
function computeFee(days, dailyFee, quantity, replacementCost) {
  const fee = days * dailyFee * quantity;
  const cap = replacementCost * quantity;
  return cap > 0 ? Math.min(fee, cap) : fee;
}

// A borrower's standing: active loans, overdue items, unpaid fines, and whether they are blocked
async function getStanding(borrower) {
  const active = await Borrowing.find({
    borrower: borrower._id,
    status: { $in: HOLDING_STATUSES },
  }).populate("equipment", "name"); // Bring in the item name so we can show it

  const overdueItems = active.filter(
    (b) => (b.status === "active" || b.status === "overdue") && daysOverdue(b.dueDate) > 0
  ).length;

  const unpaidFines = await Fine.find({ borrower: borrower._id, status: "unpaid" });
  const unpaidTotal = unpaidFines.reduce((sum, f) => sum + f.amount, 0);

  const reasons = [];
  if (borrower.status !== "active") reasons.push("Borrower account is inactive");
  if (unpaidTotal > 0) reasons.push(`Has unpaid fines of PHP ${unpaidTotal}`);
  if (overdueItems > 0) reasons.push(`Has ${overdueItems} overdue item(s)`);

  // NEW: Grab the name and due date of everything they currently have
  const activeLoansList = active.map(b => ({
    itemName: b.equipment?.name || "Deleted Item",
    dueDate: b.dueDate
  }));

  return {
    activeLoans: active.length,
    activeLoansList, // Send this list to the frontend
    overdueItems,
    unpaidFines: unpaidFines.length,
    unpaidTotal,
    blocked: reasons.length > 0,
    reasons,
  };
}

module.exports = {
  nextStatuses,
  HOLDING_STATUSES,
  FACULTY_LOAN_MULTIPLIER,
  getHeldQuantity,
  getAvailability,
  computeFee,
  getStanding,
};