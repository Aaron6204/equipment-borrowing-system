import { z } from "zod";

export const borrowingSchema = z.object({
  borrower: z.string().min(1, "Select a borrower"),
  equipment: z.string().min(1, "Select an item"),
  quantity: z
    .number({ message: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  purpose: z.string().trim().max(200, "Purpose must be 200 characters or fewer"),
});

export type BorrowingFormValues = z.infer<typeof borrowingSchema>;
