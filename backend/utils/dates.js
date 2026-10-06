const ONE_DAY = 24 * 60 * 60 * 1000; // milliseconds in one day

// Due date = borrow date + loan days, set to the end of that day (11:59 PM),
// so an item returned any time on its due date is still on time.
function computeDueDate(borrowDate, loanDays) {
  const due = new Date(borrowDate);
  due.setDate(due.getDate() + loanDays);
  due.setHours(23, 59, 59, 999);
  return due;
}

// Whole days late. Returns 0 when there is no due date or it is not yet past.
function daysOverdue(dueDate, comparedTo = new Date()) {
  if (!dueDate) return 0;
  const difference = new Date(comparedTo) - new Date(dueDate);
  if (difference <= 0) return 0;
  return Math.ceil(difference / ONE_DAY);
}

module.exports = { ONE_DAY, computeDueDate, daysOverdue };
