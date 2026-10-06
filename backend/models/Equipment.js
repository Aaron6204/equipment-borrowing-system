const mongoose = require("mongoose");

// An item in the inventory.
// - non-consumable: borrowed and returned (ruler, calculator)
// - consumable: issued and used up (paper, glue, tape)
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
    // Used as the cap for overdue fees (0 means no cap).
    replacementCost: { type: Number, default: 0, min: [0, "Replacement cost cannot be negative"] },
    condition: {
      type: String,
      enum: { values: ["good", "damaged", "retired"], message: "Condition must be good, damaged, or retired" },
      default: "good",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Equipment", equipmentSchema);
