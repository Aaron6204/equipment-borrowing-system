const express = require("express");
const {
  getBorrowings,
  getOverdueBorrowings,
  getBorrowingById,
  createBorrowing,
  updateBorrowing,
  changeBorrowingStatus,
  deleteBorrowing,
} = require("../controllers/borrowingController");

const router = express.Router();

router.get("/", getBorrowings);
router.get("/overdue", getOverdueBorrowings);  // must come before "/:id"
router.get("/:id", getBorrowingById);
router.post("/", createBorrowing);
router.put("/:id", updateBorrowing);
router.patch("/:id/status", changeBorrowingStatus);
router.delete("/:id", deleteBorrowing);

module.exports = router;
