const express = require("express");
const {
  getEquipment,
  getLowStock,
  getEquipmentById,
  checkAvailability,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} = require("../controllers/equipmentController");

const router = express.Router();

router.get("/", getEquipment);
router.get("/low-stock", getLowStock);  // must come before "/:id"
router.get("/:id", getEquipmentById);
router.get("/:id/availability", checkAvailability);
router.post("/", createEquipment);
router.put("/:id", updateEquipment);
router.delete("/:id", deleteEquipment);

module.exports = router;
