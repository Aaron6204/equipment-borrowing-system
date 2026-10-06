import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
  maxLoanDays: z
    .number({ message: "Enter the loan days" })
    .int("Loan days must be a whole number")
    .min(1, "At least 1 day")
    .max(30, "At most 30 days"),
  dailyFee: z.number({ message: "Enter the daily fee" }).min(0, "Fee cannot be negative"),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
