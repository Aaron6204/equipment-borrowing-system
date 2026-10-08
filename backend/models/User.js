const mongoose = require("mongoose");

// Accounts are separate from borrower records. A user signs in to access SEBS,
// while a borrower is the person attached to an equipment transaction.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, maxlength: 100 },
    studentNumber: { type: String, required: [true, "School ID number is required"], trim: true, unique: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email is not valid"],
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
