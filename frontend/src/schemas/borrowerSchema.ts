import { z } from "zod";

export const borrowerSchema = z.object({
  studentNumber: z.string().trim().min(3, "ID number must be at least 3 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email address"),
  type: z.enum(["student", "faculty"], { message: "Select a type" }),
  status: z.enum(["active", "inactive"], { message: "Select a status" }),
});

export type BorrowerFormValues = z.infer<typeof borrowerSchema>;
