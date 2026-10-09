const Equipment = require("../models/Equipment");
const Borrower = require("../models/Borrower");
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const httpError = require("../utils/httpError");
const { daysOverdue, ONE_DAY } = require("../utils/dates");
const { isPurchase } = require("../utils/rules");

// Rounds to one decimal place, for example 66.666 -> 66.7
const round1 = (number) => Math.round(number * 10) / 10;
// Rounds money to centavos, for example 12.345 -> 12.35
const roundMoney = (amount) => Math.round(amount * 100) / 100;

// The time ranges the statistics page can be filtered by.
const PERIODS = {
  today: "Today",
  week: "Past week",
  month: "Past month",
  quarter: "Past 3 months",
  year: "Past year",
  all: "All time",
};

// Returns the start of the chosen period, or null for "all time".
function periodStart(key, now = new Date()) {
  const start = new Date(now);
  switch (key) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return start;
    case "week":
      return new Date(now.getTime() - 7 * ONE_DAY);
    case "month":
      start.setMonth(start.getMonth() - 1);
      return start;
    case "quarter":
      start.setMonth(start.getMonth() - 3);
      return start;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      return start;
    default:
      return null;
  }
}

// PROCESSING: GET /api/statistics?period=today|week|month|quarter|year|all
// Summaries computed from the stored records: counts, rates, averages, and rankings.
// Activity (loans, returns, sales, fines) is limited to the chosen period.
// The "right now" numbers (inventory, items out, overdue, unpaid fines) always show the current state.
async function getStatistics(req, res) {
  const key = req.query.period || "all";
  if (!PERIODS[key]) {
    throw httpError(400, `Unknown period "${key}". Use: ${Object.keys(PERIODS).join(", ")}`);
  }
  const since = periodStart(key);
  const inPeriod = (date) => !since || (date && new Date(date) >= since);

  const equipment = await Equipment.find();
  const borrowerCount = await Borrower.countDocuments();
  const all = await Borrowing.find().populate("equipment", "name type");
  const fines = await Fine.find();

  // Loans are non-consumables (borrowed and returned). Purchases are consumables (bought with cash).
  const allLoans = all.filter((b) => !isPurchase(b));
  const allPurchases = all.filter((b) => isPurchase(b));

  // ---------- Right now (not affected by the period) ----------
  const loansOut = allLoans.filter((b) => ["ready_for_pickup", "active", "overdue"].includes(b.status));
  const overdueNow = allLoans.filter(
    (b) => b.status === "overdue" || (b.status === "active" && daysOverdue(b.dueDate) > 0)
  ).length;
  const consumables = equipment.filter((e) => e.type === "consumable");
  const lowStock = consumables.filter((e) => e.totalQuantity <= e.reorderLevel).length;
  const awaitingPickup = allPurchases.filter((b) => ["in_review", "ready_for_pickup"].includes(b.status)).length;

  // ---------- Loans requested in the period ----------
  const loans = allLoans.filter((b) => inPeriod(b.borrowDate));

  // 1. Loans counted per status
  const byStatus = { in_review: 0, ready_for_pickup: 0, active: 0, overdue: 0, returned: 0, cancelled: 0 };
  loans.forEach((b) => {
    if (byStatus[b.status] !== undefined) byStatus[b.status] += 1;
  });

  // 2. Returns made in the period: on-time rate and average days kept
  const returned = allLoans.filter((b) => b.status === "returned" && inPeriod(b.returnDate));
  const onTime = returned.filter((b) => daysOverdue(b.dueDate, b.returnDate) === 0).length;
  const onTimeRate = returned.length ? round1((onTime / returned.length) * 100) : 0;
  const totalDaysKept = returned.reduce(
    (sum, b) => sum + (b.returnDate - (b.releasedAt || b.borrowDate)) / ONE_DAY, 0
  );
  const averageLoanDays = returned.length ? round1(totalDaysKept / returned.length) : 0;

  // 3. Most borrowed items (by total units, cancelled requests excluded)
  const unitsPerItem = {};
  loans
    .filter((b) => b.status !== "cancelled" && b.equipment)
    .forEach((b) => {
      const id = String(b.equipment._id);
      if (!unitsPerItem[id]) {
        unitsPerItem[id] = { _id: id, name: b.equipment.name, type: b.equipment.type, units: 0, times: 0 };
      }
      unitsPerItem[id].units += b.quantity;
      unitsPerItem[id].times += 1;
    });
  const mostBorrowed = Object.values(unitsPerItem)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  // ---------- Consumable sales completed in the period ----------
  const sales = allPurchases.filter(
    (b) => b.status === "purchased" && inPeriod(b.purchasedAt || b.releasedAt || b.updatedAt)
  );
  const revenue = roundMoney(sales.reduce((sum, b) => sum + (b.totalPrice || 0), 0));
  const unitsSold = sales.reduce((sum, b) => sum + b.quantity, 0);

  const salesPerItem = {};
  sales
    .filter((b) => b.equipment)
    .forEach((b) => {
      const id = String(b.equipment._id);
      if (!salesPerItem[id]) salesPerItem[id] = { _id: id, name: b.equipment.name, units: 0, revenue: 0, times: 0 };
      salesPerItem[id].units += b.quantity;
      salesPerItem[id].revenue = roundMoney(salesPerItem[id].revenue + (b.totalPrice || 0));
      salesPerItem[id].times += 1;
    });
  const topSellers = Object.values(salesPerItem)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  // ---------- Fines ----------
  // Issued and collected follow the period. Unpaid is everything still owed right now.
  const issued = fines.filter((f) => inPeriod(f.createdAt));
  const collected = fines.filter((f) => f.status === "paid" && inPeriod(f.paidAt || f.updatedAt));
  const unpaid = fines.filter((f) => f.status === "unpaid");
  const sum = (list) => roundMoney(list.reduce((total, f) => total + f.amount, 0));
  const amounts = issued.map((f) => f.amount);

  res.json({
    period: { key, label: PERIODS[key], since },
    totals: {
      equipment: equipment.length,
      consumable: consumables.length,
      nonConsumable: equipment.length - consumables.length,
      borrowers: borrowerCount,
      // Loans requested in the period
      borrowings: loans.length,
      // Loans ready for pickup, checked out, or overdue right now
      activeBorrowings: loansOut.length,
      overdueNow,
      lowStock,
    },
    byStatus,
    returns: { returned: returned.length, onTime, late: returned.length - onTime, onTimeRate, averageLoanDays },
    mostBorrowed,
    sales: {
      count: sales.length,
      units: unitsSold,
      revenue,
      average: sales.length ? roundMoney(revenue / sales.length) : 0,
      awaitingPickup,
      topSellers,
    },
    fines: {
      count: issued.length,
      collected: sum(collected),
      unpaid: sum(unpaid),
      highest: amounts.length ? Math.max(...amounts) : 0,
      average: amounts.length ? round1(sum(issued) / amounts.length) : 0,
    },
  });
}

module.exports = {
  getStatistics,
};
