const express = require("express");
const {
  getFines,
  getFineById,
  createFine,
  updateFine,
  deleteFine,
} = require("../controllers/fineController");

const router = express.Router();

router.get("/", getFines);
router.get("/:id", getFineById);
router.post("/", createFine);
router.put("/:id", updateFine);
router.delete("/:id", deleteFine);

module.exports = router;
