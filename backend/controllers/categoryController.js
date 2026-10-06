const Category = require("../models/Category");
const Equipment = require("../models/Equipment");
const httpError = require("../utils/httpError");

// GET /api/categories - list all categories
async function getCategories(req, res) {
  const categories = await Category.find().sort("name");
  res.json(categories);
}

// GET /api/categories/:id - get one category
async function getCategoryById(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, "Category not found");
  res.json(category);
}

// POST /api/categories - create a category
async function createCategory(req, res) {
  const category = await Category.create(req.body);
  res.status(201).json(category);
}

// PUT /api/categories/:id - update a category
async function updateCategory(req, res) {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!category) throw httpError(404, "Category not found");
  res.json(category);
}

// DELETE /api/categories/:id - delete a category
// Rule: a category that still has equipment cannot be deleted.
async function deleteCategory(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw httpError(404, "Category not found");

  const inUse = await Equipment.countDocuments({ category: category._id });
  if (inUse > 0) {
    throw httpError(400, `Cannot delete: ${inUse} equipment item(s) use this category`);
  }

  await category.deleteOne();
  res.json({ message: "Category deleted" });
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
