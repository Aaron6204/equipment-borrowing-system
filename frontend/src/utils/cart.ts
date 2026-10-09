import type { Borrowing } from "../types";
import type { CartItem } from "../components/Layout";

// A student may have at most this many non-consumable items requested or borrowed at once.
// Consumables are bought, not borrowed, so they have no limit beyond what is in stock.
// The server checks the same rule (MAX_LOAN_UNITS in backend/utils/rules.js).
export const MAX_LOAN_ITEMS = 2;

// Booking statuses that still count toward the limit (requested, waiting, or not yet returned).
const OPEN_LOAN_STATUSES = ["in_review", "ready_for_pickup", "active", "overdue"];

// Non-consumable units sitting in the cart.
export function loanUnitsInCart(cart: CartItem[]): number {
  return cart.filter((item) => item.type !== "consumable").reduce((sum, item) => sum + item.cartQuantity, 0);
}

// Non-consumable units the student has already requested or borrowed and not yet returned.
export function openLoanUnits(bookings: Borrowing[]): number {
  return bookings
    .filter((b) => b.equipment?.type !== "consumable" && OPEN_LOAN_STATUSES.includes(b.status))
    .reduce((sum, b) => sum + b.quantity, 0);
}
