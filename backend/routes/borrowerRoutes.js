const express = require("express");
const {
  getBorrowers,
  getBorrowerById,
  getBorrowerStanding,
  createBorrower,
  updateBorrower,
  deleteBorrower,
} = require("../controllers/borrowerController");

const router = express.Router();

router.get("/", getBorrowers);
router.get("/:id", getBorrowerById);
router.get("/:id/standing", getBorrowerStanding);
router.post("/", createBorrower);
router.put("/:id", updateBorrower);
router.delete("/:id", deleteBorrower);

module.exports = router;
