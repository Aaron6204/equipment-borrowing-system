import { z } from "zod";

// Validation rules for the equipment form. They mirror the Mongoose schema.
export const equipmentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Select a category"),
  type: z.enum(["consumable", "non-consumable"], { message: "Select a type" }),
  totalQuantity: z
    .number({ message: "Enter a quantity" })
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative"),
  reorderLevel: z
    .number({ message: "Enter a reorder level" })
    .int("Reorder level must be a whole number")
    .min(0, "Reorder level cannot be negative"),
  replacementCost: z.number({ message: "Enter a replacement cost" }).min(0, "Cost cannot be negative"),
  condition: z.enum(["good", "damaged", "retired"], { message: "Select a condition" }),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;
