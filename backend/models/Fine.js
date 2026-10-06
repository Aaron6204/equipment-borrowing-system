const mongoose = require("mongoose");

// An overdue fee. Created automatically when a late item is returned.
const fineSchema = new mongoose.Schema(
  {
    borrowing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrowing",
      required: [true, "Borrowing is required"],
      unique: true, // one fine per borrowing
    },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Borrower",
      required: [true, "Borrower is required"],
    },
    daysOverdue: {
      type: Number,
      required: [true, "Days overdue is required"],
      min: [1, "Days overdue must be at least 1"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    status: {
      type: String,
      enum: { values: ["unpaid", "paid"], message: "Status must be unpaid or paid" },
      default: "unpaid",
    },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Fine", fineSchema);
