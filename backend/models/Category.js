const mongoose = require("mongoose");

// A category groups equipment and sets the loan period and late fee for it.
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Category name must be 50 characters or fewer"],
    },
    description: { type: String, trim: true, default: "" },
    maxLoanDays: {
      type: Number,
      default: 3,
      min: [1, "Loan days must be at least 1"],
      max: [30, "Loan days must be 30 or fewer"],
    },
    dailyFee: {
      type: Number,
      default: 10,
      min: [0, "Daily fee cannot be negative"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
