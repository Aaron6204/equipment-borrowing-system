const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  studentNumber: { type: String }, // Optional for staff
  // ADD THIS ROLE FIELD:
  role: { 
    type: String, 
    enum: ['admin', 'borrower'], 
    default: 'borrower' 
  },
  status: { type: String,
     enum: ["active", "suspended"], 
     default: "active" }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
