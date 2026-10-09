const express = require("express");
const router = express.Router();
const { getUsers, updateUserRole, deleteUser, updateUserStatus } = require("../controllers/userController");

// Assuming you have an async wrapper or auth middleware, you would apply them here
router.get("/", getUsers);
router.patch("/:id/role", updateUserRole);
router.patch("/:id/status", updateUserStatus);
router.delete("/:id", deleteUser);

module.exports = router;