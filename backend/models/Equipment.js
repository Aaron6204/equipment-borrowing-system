const mongoose = require("mongoose");

// An item in the inventory.
// - non-consumable: borrowed and returned (ruler, calculator)
// - consumable: bought by the student with cash and used up (paper, glue, tape)
const equipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Equipment name is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    type: {
      type: String,
      enum: { values: ["consumable", "non-consumable"], message: "Type must be consumable or non-consumable" },
      required: [true, "Type is required"],
    },
    totalQuantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    // Consumables at or below this level are flagged as low stock.
    reorderLevel: { type: Number, default: 0, min: [0, "Reorder level cannot be negative"] },
    // Non-consumables only: used as the cap for overdue fees (0 means no cap).
    replacementCost: { type: Number, default: 0, min: [0, "Replacement cost cannot be negative"] },
    // Consumables only: the price a student pays in cash for one unit.
    costPerUnit: { type: Number, default: 0, min: [0, "Cost per unit cannot be negative"] },
    // Non-consumables only. Consumables are always brand new, so they stay "good".
    condition: {
      type: String,
      enum: { values: ["good", "damaged", "retired"], message: "Condition must be good, damaged, or retired" },
      default: "good",
    },
    // What is wrong with a damaged item. Empty unless the condition is "damaged".
    damageNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Damage notes must be 300 characters or fewer"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
