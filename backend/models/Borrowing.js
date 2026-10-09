const mongoose = require("mongoose");

// One item in a booking: who borrowed (non-consumable) or bought (consumable) what, how many, and its status.
// Items checked out together share the same bookingId, so they show up and are handled as one booking.
const borrowingSchema = new mongoose.Schema(
  {
    // Shared by every item in the same booking. Older records without one count as a booking of their own.
    bookingId: { type: String, default: null, index: true },
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
    // Consumables only. The price is copied from the item when the request is made,
    // so changing an item's price later does not rewrite past sales.
    unitPrice: { type: Number, default: 0, min: [0, "Price cannot be negative"] },
    totalPrice: { type: Number, default: 0, min: [0, "Price cannot be negative"] },
    // When a consumable was paid for in cash and handed over.
    purchasedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: {
        // "purchased" is the final status for consumables: they are bought, never returned.
        values: ["in_review", "ready_for_pickup", "active", "returned", "overdue", "purchased", "cancelled"],
        message: "Status is not valid",
      },
      default: "in_review",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Borrowing", borrowingSchema);
