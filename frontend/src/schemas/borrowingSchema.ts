import { z } from "zod";

// One row of the admin booking form: an item and how many.
const bookingItemSchema = z.object({
  equipment: z.string().min(1, "Select an item"),
  quantity: z
    .number({ message: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
});

// The admin booking form: one borrower, one or more different items, and an optional purpose.
// Stock and the 2 non-consumable limit are checked on the page and again by the server.
export const borrowingSchema = z.object({
  borrower: z.string().min(1, "Select a borrower"),
  items: z.array(bookingItemSchema).min(1, "Add at least one item"),
  purpose: z.string().trim().max(200, "Purpose must be 200 characters or fewer"),
});

export type BorrowingFormValues = z.infer<typeof borrowingSchema>;
