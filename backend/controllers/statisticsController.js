const Equipment = require("../models/Equipment");
const Borrower = require("../models/Borrower");
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const { daysOverdue, ONE_DAY } = require("../utils/dates");

// Rounds to one decimal place, for example 66.666 -> 66.7
const round1 = (number) => Math.round(number * 10) / 10;

// PROCESSING: GET /api/statistics
// Summaries computed from the stored records: counts, rates, averages, and rankings.
async function getStatistics(req, res) {
  const equipment = await Equipment.find();
  const borrowerCount = await Borrower.countDocuments();
  const borrowings = await Borrowing.find().populate("equipment", "name type");
  const fines = await Fine.find();

  // 1. Borrowings counted per NEW pipeline status
  const byStatus = { in_review: 0, ready_for_pickup: 0, active: 0, returned: 0, overdue: 0, cancelled: 0 };
  borrowings.forEach((b) => { 
    if (byStatus[b.status] !== undefined) {
      byStatus[b.status] += 1; 
    }
  });

  // 2. Overdue right now (officially marked overdue, or active but past the due date)
  const overdueNow = borrowings.filter(
    (b) => b.status === "overdue" || (b.status === "active" && daysOverdue(b.dueDate) > 0)
  ).length;

  // 3. On-time return rate = on-time returns / all returns
  const returned = borrowings.filter((b) => b.status === "returned");
  const onTime = returned.filter((b) => daysOverdue(b.dueDate, b.returnDate) === 0).length;
  const onTimeRate = returned.length ? round1((onTime / returned.length) * 100) : 0;

  // 4. Average number of days an item was kept
  const totalDaysKept = returned.reduce(
    (sum, b) => sum + (b.returnDate - (b.releasedAt || b.borrowDate)) / ONE_DAY, 0
  );
  const averageLoanDays = returned.length ? round1(totalDaysKept / returned.length) : 0;

  // 5. Most borrowed items (by total units, cancelled requests excluded)
  const unitsPerItem = {};
  borrowings
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

  // 6. Fines: collected, unpaid, highest, and average
  const paid = fines.filter((f) => f.status === "paid");
  const unpaid = fines.filter((f) => f.status === "unpaid");
  const sum = (list) => list.reduce((total, f) => total + f.amount, 0);
  const amounts = fines.map((f) => f.amount);

  // 7. Inventory split by type
  const consumables = equipment.filter((e) => e.type === "consumable");
  const lowStock = consumables.filter((e) => e.totalQuantity <= e.reorderLevel).length;

  res.json({
    totals: {
      equipment: equipment.length,
      consumable: consumables.length,
      nonConsumable: equipment.length - consumables.length,
      borrowers: borrowerCount,
      borrowings: borrowings.length,
      // "Active Borrowings" now counts anything ready for pickup, actively checked out, or currently overdue
      activeBorrowings: byStatus.ready_for_pickup + byStatus.active + byStatus.overdue,
      overdueNow,
      lowStock,
    },
    byStatus,
    returns: { returned: returned.length, onTime, late: returned.length - onTime, onTimeRate, averageLoanDays },
    mostBorrowed,
    fines: {
      count: fines.length,
      collected: sum(paid),
      unpaid: sum(unpaid),
      highest: amounts.length ? Math.max(...amounts) : 0,
      average: amounts.length ? round1(sum(fines) / amounts.length) : 0,
    },
  });
}

module.exports = {
  getStatistics,
};