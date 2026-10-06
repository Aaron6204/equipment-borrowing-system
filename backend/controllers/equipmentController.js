const Equipment = require("../models/Equipment");
const Borrowing = require("../models/Borrowing");
const httpError = require("../utils/httpError");
const { getAvailability, getHeldQuantity, HOLDING_STATUSES } = require("../utils/rules");

// Adds the computed "available" and "lowStock" values to each equipment item.
// Held units are counted once for the whole list instead of once per item.
async function withAvailability(equipmentList) {
  const activeBorrowings = await Borrowing.find({
    status: { $in: HOLDING_STATUSES },
  }).select("equipment quantity");

  return equipmentList.map((item) => {
    const held = activeBorrowings
      .filter((b) => String(b.equipment) === String(item._id))
      .reduce((sum, b) => sum + b.quantity, 0);

    const available = item.condition === "good" ? Math.max(item.totalQuantity - held, 0) : 0;
    const lowStock = item.type === "consumable" && item.totalQuantity <= item.reorderLevel;

    return { ...item.toObject(), held, available, lowStock };
  });
}

// PROCESSING: GET /api/equipment?category=&type=&condition=&search=&sort=
// Multi-criteria search, filtering, and sorting. Also the "list all" endpoint.
async function getEquipment(req, res) {
  const { category, type, condition, search, sort } = req.query;

  const filter = {};
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (condition) filter.condition = condition;
  if (search) {
    // Escape special characters so the search text is treated as plain text.
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: safe, $options: "i" };
  }

  const equipment = await Equipment.find(filter).populate("category").sort("name");
  const result = await withAvailability(equipment);

  // Sorting. A leading "-" means descending, for example sort=-available
  const allowed = ["name", "totalQuantity", "available", "createdAt"];
  const field = (sort || "name").replace("-", "");
  const direction = (sort || "").startsWith("-") ? -1 : 1;
  if (!allowed.includes(field)) {
    throw httpError(400, `Cannot sort by "${field}". Use: ${allowed.join(", ")}`);
  }
  result.sort((a, b) => {
    if (a[field] < b[field]) return -1 * direction;
    if (a[field] > b[field]) return 1 * direction;
    return 0;
  });

  res.json(result);
}

// PROCESSING: GET /api/equipment/low-stock
// Consumables whose remaining stock is at or below their reorder level.
// (Defined before "/:id" so that "low-stock" is not read as an ID.)
async function getLowStock(req, res) {
  const consumables = await Equipment.find({ type: "consumable" }).populate("category");
  const lowStock = consumables
    .filter((item) => item.totalQuantity <= item.reorderLevel)
    .map((item) => ({
      ...item.toObject(),
      shortBy: item.reorderLevel - item.totalQuantity,
      outOfStock: item.totalQuantity === 0,
    }));
  res.json(lowStock);
}

// GET /api/equipment/:id - get one equipment item
async function getEquipmentById(req, res) {
  const equipment = await Equipment.findById(req.params.id).populate("category");
  if (!equipment) throw httpError(404, "Equipment not found");
  const [result] = await withAvailability([equipment]);
  res.json(result);
}

// PROCESSING: GET /api/equipment/:id/availability?quantity=2
// Answers "how many units can be borrowed right now, and is my request possible?"
async function checkAvailability(req, res) {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) throw httpError(404, "Equipment not found");

  const requested = Number(req.query.quantity) || 1;
  if (requested < 1) throw httpError(400, "Quantity must be at least 1");

  const { total, held, available, usable } = await getAvailability(equipment);

  let reason = "Available";
  if (!usable) reason = `Equipment is ${equipment.condition}`;
  else if (available === 0) reason = "No units available";
  else if (requested > available) reason = `Only ${available} unit(s) available`;

  res.json({
    equipment: equipment.name,
    type: equipment.type,
    total,
    held,
    available,
    requested,
    canBorrow: usable && requested <= available,
    reason,
  });
}

// POST /api/equipment - create an equipment item
async function createEquipment(req, res) {
  const equipment = await Equipment.create(req.body);
  res.status(201).json(equipment);
}

// PUT /api/equipment/:id - update an equipment item
// Rule: the total quantity cannot be set below the units currently held.
async function updateEquipment(req, res) {
  const existing = await Equipment.findById(req.params.id);
  if (!existing) throw httpError(404, "Equipment not found");

  if (req.body.totalQuantity !== undefined) {
    const held = await getHeldQuantity(existing);
    if (Number(req.body.totalQuantity) < held) {
      throw httpError(400, `Quantity cannot be below ${held}, the units currently held by borrowers`);
    }
  }

  const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.json(equipment);
}

// DELETE /api/equipment/:id - delete an equipment item
// Rule: equipment with pending, approved, or released borrowings cannot be deleted.
async function deleteEquipment(req, res) {
  const equipment = await Equipment.findById(req.params.id);
  if (!equipment) throw httpError(404, "Equipment not found");

  const active = await Borrowing.countDocuments({
    equipment: equipment._id,
    status: { $in: ["pending", "approved", "released"] },
  });
  if (active > 0) {
    throw httpError(400, `Cannot delete: ${active} active borrowing(s) use this equipment`);
  }

  await equipment.deleteOne();
  res.json({ message: "Equipment deleted" });
}

module.exports = {
  getEquipment,
  getLowStock,
  getEquipmentById,
  checkAvailability,
  createEquipment,
  updateEquipment,
  deleteEquipment,
};
