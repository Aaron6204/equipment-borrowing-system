const mongoose = require("mongoose");

// A person who may borrow equipment.
const borrowerSchema = new mongoose.Schema(
  {
    studentNumber: {
      type: String,
      required: [true, "ID number is required"],
      unique: true,
      trim: true,
    },
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email is not valid"],
    },
    type: {
      type: String,
      enum: { values: ["student", "faculty"], message: "Type must be student or faculty" },
      default: "student",
    },
    status: {
      type: String,
      enum: { values: ["active", "inactive"], message: "Status must be active or inactive" },
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Borrower", borrowerSchema);
