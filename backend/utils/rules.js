// All business rules are kept in this one file so they are easy to find and explain.
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const { daysOverdue } = require("./dates");
const httpError = require("./httpError");

// Which status may come next, depending on the kind of item.
// - Non-consumables are lent: in review -> ready for pickup -> active -> returned (or overdue -> returned)
// - Consumables are sold:     in review -> ready for pickup -> purchased (paid in cash, never returned)
const LOAN_FLOW = {
  in_review: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["active", "cancelled"],
  active: ["returned", "overdue"],
  overdue: ["returned"],
  returned: [],
  cancelled: [],
};

const PURCHASE_FLOW = {
  in_review: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["purchased", "cancelled"],
  // Consumable requests released before purchases existed can still be settled as paid.
  active: ["purchased"],
  purchased: [],
  returned: [],
  cancelled: [],
};

function nextStatuses(currentStatus, equipmentType) {
  const flow = equipmentType === "consumable" ? PURCHASE_FLOW : LOAN_FLOW;
  return flow[currentStatus] || [];
}

// True when a transaction is a purchase of a consumable rather than a loan.
// Falls back to the status when the item has since been deleted.
function isPurchase(borrowing) {
  if (borrowing.equipment && borrowing.equipment.type) return borrowing.equipment.type === "consumable";
  return borrowing.status === "purchased";
}

// Statuses that hold units of an item so others can't borrow them
const HOLDING_STATUSES = ["ready_for_pickup", "active", "overdue"];

// Faculty may keep an item twice as long as students.
const FACULTY_LOAN_MULTIPLIER = 2;

// A borrower may have at most this many non-consumable units requested or borrowed at once.
// Consumables are bought, not borrowed, so they have no limit beyond the stock.
const MAX_LOAN_UNITS = 2;

// Booking statuses that still count toward the limit (requested, waiting, or not yet returned).
const OPEN_LOAN_STATUSES = ["in_review", "ready_for_pickup", "active", "overdue"];

// Counts the non-consumable units a borrower has requested or borrowed and not yet returned.
async function getOpenLoanUnits(borrowerId, excludeBorrowingId = null) {
  const filter = { borrower: borrowerId, status: { $in: OPEN_LOAN_STATUSES } };
  if (excludeBorrowingId) filter._id = { $ne: excludeBorrowingId };

  const open = await Borrowing.find(filter).populate("equipment", "type").select("quantity equipment status");
  return open.filter((b) => !isPurchase(b)).reduce((sum, b) => sum + b.quantity, 0);
}

// Throws a 400 error when borrowing this many more units would go over the limit.
async function checkLoanLimit(borrowerId, quantity, excludeBorrowingId = null) {
  const openUnits = await getOpenLoanUnits(borrowerId, excludeBorrowingId);
  if (openUnits + quantity > MAX_LOAN_UNITS) {
    const left = Math.max(MAX_LOAN_UNITS - openUnits, 0);
    throw httpError(
      400,
      `Only ${MAX_LOAN_UNITS} non-consumable items can be borrowed at a time. ` +
        `${openUnits} already requested or borrowed, so ${left} more can be borrowed.`
    );
  }
}

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
  // Consumables are always brand new; only non-consumables can be damaged or retired.
  const usable = equipment.type === "consumable" || equipment.condition === "good";
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
  const held = await Borrowing.find({
    borrower: borrower._id,
    status: { $in: HOLDING_STATUSES },
  }).populate("equipment", "name type"); // Bring in the item name so we can show it

  // Consumables waiting for pickup are purchases, not loans, so they are not counted here.
  const active = held.filter((b) => !isPurchase(b));

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

  // Non-consumables requested or borrowed and not yet returned, for the 2-item limit.
  const openLoanUnits = await getOpenLoanUnits(borrower._id);

  return {
    activeLoans: active.length,
    activeLoansList, // Send this list to the frontend
    openLoanUnits,
    loanLimit: MAX_LOAN_UNITS,
    overdueItems,
    unpaidFines: unpaidFines.length,
    unpaidTotal,
    blocked: reasons.length > 0,
    reasons,
  };
}

module.exports = {
  nextStatuses,
  isPurchase,
  HOLDING_STATUSES,
  FACULTY_LOAN_MULTIPLIER,
  MAX_LOAN_UNITS,
  getOpenLoanUnits,
  checkLoanLimit,
  getHeldQuantity,
  getAvailability,
  computeFee,
  getStanding,
};