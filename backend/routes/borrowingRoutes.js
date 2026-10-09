const express = require("express");
const {
  getBorrowings,
  getOverdueBorrowings,
  getBorrowingById,
  createBorrowing,
  createBorrowingBatch,
  updateBorrowing,
  changeBorrowingStatus,
  deleteBorrowing,
  changeBookingStatus,
  deleteBooking,
} = require("../controllers/borrowingController");

const router = express.Router();

router.get("/", getBorrowings);
router.get("/overdue", getOverdueBorrowings);  // must come before "/:id"
router.get("/:id", getBorrowingById);
router.post("/", createBorrowing);
router.post("/batch", createBorrowingBatch);   // several items for one borrower at once
router.put("/:id", updateBorrowing);
router.patch("/:id/status", changeBorrowingStatus);
router.delete("/:id", deleteBorrowing);

// Whole bookings: every item checked out together moves as one
router.patch("/bookings/:bookingId/status", changeBookingStatus);
router.delete("/bookings/:bookingId", deleteBooking);

module.exports = router;
