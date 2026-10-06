const Borrower = require("../models/Borrower");
const Borrowing = require("../models/Borrowing");
const Fine = require("../models/Fine");
const httpError = require("../utils/httpError");
const { getStanding } = require("../utils/rules");

// GET /api/borrowers?search= - list all borrowers
async function getBorrowers(req, res) {
  const filter = {};
  if (req.query.search) {
    const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { studentNumber: { $regex: safe, $options: "i" } },
    ];
  }
  const borrowers = await Borrower.find(filter).sort("name");
  res.json(borrowers);
}

// GET /api/borrowers/:id - get one borrower
async function getBorrowerById(req, res) {
  const borrower = await Borrower.findById(req.params.id);
  if (!borrower) throw httpError(404, "Borrower not found");
  res.json(borrower);
}

// PROCESSING: GET /api/borrowers/:id/standing
// Active loans, overdue items, unpaid fines, and whether the borrower is blocked.
async function getBorrowerStanding(req, res) {
  const borrower = await Borrower.findById(req.params.id);
  if (!borrower) throw httpError(404, "Borrower not found");

  const standing = await getStanding(borrower);
  res.json({ borrower: borrower.name, ...standing });
}

// POST /api/borrowers - create a borrower
async function createBorrower(req, res) {
  const borrower = await Borrower.create(req.body);
  res.status(201).json(borrower);
}

// PUT /api/borrowers/:id - update a borrower
async function updateBorrower(req, res) {
  const borrower = await Borrower.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!borrower) throw httpError(404, "Borrower not found");
  res.json(borrower);
}

// DELETE /api/borrowers/:id - delete a borrower
// Rule: a borrower with active borrowings or unpaid fines cannot be deleted.
async function deleteBorrower(req, res) {
  const borrower = await Borrower.findById(req.params.id);
  if (!borrower) throw httpError(404, "Borrower not found");

  const active = await Borrowing.countDocuments({
    borrower: borrower._id,
    status: { $in: ["pending", "approved", "released"] },
  });
  if (active > 0) throw httpError(400, `Cannot delete: borrower has ${active} active borrowing(s)`);

  const unpaid = await Fine.countDocuments({ borrower: borrower._id, status: "unpaid" });
  if (unpaid > 0) throw httpError(400, `Cannot delete: borrower has ${unpaid} unpaid fine(s)`);

  await borrower.deleteOne();
  res.json({ message: "Borrower deleted" });
}

module.exports = {
  getBorrowers,
  getBorrowerById,
  getBorrowerStanding,
  createBorrower,
  updateBorrower,
  deleteBorrower,
};
