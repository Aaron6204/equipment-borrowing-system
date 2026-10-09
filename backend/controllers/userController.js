const User = require("../models/User");
const httpError = require("../utils/httpError");

// GET /api/users - List all registered users
async function getUsers(req, res) {
  // We exclude the passwordHash for security
  const users = await User.find().select("-passwordHash").sort("-createdAt");
  res.json(users);
}

// PATCH /api/users/:id/role - Promote or demote a user
async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!['admin', 'borrower'].includes(role)) {
    throw httpError(400, "Invalid role specified");
  }

  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) throw httpError(404, "User not found");

  user.role = role;
  await user.save();
  
  res.json({ message: `User role updated to ${role}`, user });
}

// DELETE /api/users/:id - Remove an account
async function deleteUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, "User not found");
  
  await user.deleteOne();
  res.json({ message: "User account deleted successfully" });
}

async function updateUserStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) throw httpError(400, "Invalid status");

  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) throw httpError(404, "User not found");

  user.status = status;
  await user.save();
  
  res.json({ message: `User account is now ${status}`, user });
}

module.exports = { getUsers, updateUserRole, deleteUser, updateUserStatus };