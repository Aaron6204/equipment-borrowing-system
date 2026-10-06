const Fine = require("../models/Fine");
const httpError = require("../utils/httpError");

// Loads fines with the borrower and the borrowed equipment's name.
function populateFine(query) {
  return query
    .populate("borrower")
    .populate({ path: "borrowing", populate: { path: "equipment", select: "name" } });
}

// GET /api/fines?status=&borrower= - list all fines
async function getFines(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.borrower) filter.borrower = req.query.borrower;

  const fines = await populateFine(Fine.find(filter)).sort("-createdAt");
  res.json(fines);
}

// GET /api/fines/:id - get one fine
async function getFineById(req, res) {
  const fine = await populateFine(Fine.findById(req.params.id));
  if (!fine) throw httpError(404, "Fine not found");
  res.json(fine);
}

// POST /api/fines - create a fine manually
// (Fines are normally created automatically when a late item is returned.)
async function createFine(req, res) {
  const fine = await Fine.create(req.body);
  res.status(201).json(fine);
}

// PUT /api/fines/:id - update a fine (used to mark it as paid)
// Rule: a paid fine is final and cannot be changed.
async function updateFine(req, res) {
  const fine = await Fine.findById(req.params.id);
  if (!fine) throw httpError(404, "Fine not found");
  if (fine.status === "paid") throw httpError(400, "This fine is already paid and cannot be changed");

  if (req.body.amount !== undefined) fine.amount = req.body.amount;
  if (req.body.daysOverdue !== undefined) fine.daysOverdue = req.body.daysOverdue;
  if (req.body.status !== undefined) fine.status = req.body.status;
  if (fine.status === "paid") fine.paidAt = new Date();

  await fine.save(); // save() runs the schema validation
  res.json(fine);
}

// DELETE /api/fines/:id - delete a fine
async function deleteFine(req, res) {
  const fine = await Fine.findByIdAndDelete(req.params.id);
  if (!fine) throw httpError(404, "Fine not found");
  res.json({ message: "Fine deleted" });
}

module.exports = {
  getFines,
  getFineById,
  createFine,
  updateFine,
  deleteFine,
};
