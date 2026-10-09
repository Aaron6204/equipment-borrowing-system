import type { Borrowing } from "../types";

// The overall status of a booking, worked out from its items.
export type BookingStatus = "in_review" | "ready_for_pickup" | "active" | "overdue" | "completed" | "cancelled";

// A booking: every item a borrower checked out together.
export interface Booking {
  id: string; // the shared bookingId (or the item's own _id for older single-item records)
  reference: string; // short code shown to people, e.g. "#A1B2C3"
  items: Borrowing[];
  borrower: Borrowing["borrower"];
  purpose: string;
  requestedAt: string;
  status: BookingStatus;
  loans: Borrowing[]; // non-consumables (borrowed and returned)
  purchases: Borrowing[]; // consumables (bought with cash)
  cashTotal: number; // what the consumables cost, paid at pickup
  dueDate: string | null; // the earliest due date among the loans
  daysOverdue: number; // the most days late among the loans
}

const isPurchase = (item: Borrowing) => item.equipment?.type === "consumable" || item.status === "purchased";

// The booking's status follows its least-finished item:
// in review -> ready for pickup -> active (or overdue) -> completed. All cancelled -> cancelled.
export function bookingStatus(items: Borrowing[]): BookingStatus {
  const live = items.filter((item) => item.status !== "cancelled");
  if (live.length === 0) return "cancelled";
  if (live.some((item) => item.status === "in_review")) return "in_review";
  if (live.some((item) => item.status === "ready_for_pickup")) return "ready_for_pickup";
  if (live.some((item) => item.status === "overdue" || (item.status === "active" && item.daysOverdue > 0))) return "overdue";
  if (live.some((item) => item.status === "active")) return "active";
  return "completed";
}

// Groups a list of items (newest first) into bookings, keeping that order.
export function groupBookings(list: Borrowing[]): Booking[] {
  const groups = new Map<string, Borrowing[]>();
  for (const item of list) {
    const id = item.bookingId || item._id;
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }

  return [...groups.entries()].map(([id, items]) => {
    const loans = items.filter((item) => !isPurchase(item));
    const purchases = items.filter(isPurchase);
    const dueDates = loans.map((item) => item.dueDate).filter(Boolean).sort();
    return {
      id,
      reference: `#${id.slice(-6).toUpperCase()}`,
      items,
      borrower: items[0].borrower,
      purpose: items[0].purpose ?? "",
      requestedAt: items[0].borrowDate,
      status: bookingStatus(items),
      loans,
      purchases,
      cashTotal: purchases
        .filter((item) => item.status !== "cancelled")
        .reduce((sum, item) => sum + (item.totalPrice ?? 0), 0),
      dueDate: dueDates[0] ?? null,
      daysOverdue: Math.max(0, ...loans.map((item) => item.daysOverdue || 0)),
    };
  });
}
