const mongoose = require("mongoose");

// One borrowing transaction: who borrowed what, how many, and its status.
const borrowingSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipment",
      required: [true, "Equipment is required"],
    },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrower",
      required: [true, "Borrower is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    purpose: { type: String, trim: true, default: "", maxlength: [200, "Purpose must be 200 characters or fewer"] },
    borrowDate: { type: Date, default: Date.now },
    // Computed by the server. Stays null for consumables, which are not returned.
    dueDate: { type: Date, default: null },
    // When the item was handed over (released or issued).
    releasedAt: { type: Date, default: null },
    returnDate: { type: Date, default: null },
   status: {
      type: String,
      enum: {
        values: ["in_review", "ready_for_pickup", "active", "returned", "overdue", "cancelled"],
        message: "Status is not valid",
      },
      default: "in_review",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Borrowing", borrowingSchema);
