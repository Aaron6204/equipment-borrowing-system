const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Borrower = require("../models/Borrower"); // <-- Added import
const httpError = require("../utils/httpError");
const { getJwtSecret } = require("../config/auth");

function userResponse(user) {
  return { id: user._id, name: user.name, studentNumber: user.studentNumber, email: user.email, role: user.role,status: user.status || "active" };
}

function createToken(user) {
  return jwt.sign({ sub: user._id.toString() }, getJwtSecret(), { expiresIn: "8h" });
}

async function register(req, res) {
  const { name, studentNumber, email, password } = req.body;
  if (!name || !studentNumber || !email || !password) throw httpError(400, "Name, school ID, email, and password are required");
  if (password.length < 8) throw httpError(400, "Password must be at least 8 characters");

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { studentNumber }] });
  if (exists) throw httpError(400, "An account with that email or school ID already exists");

  const passwordHash = await bcrypt.hash(password, 12);
  
  // 1. Create the User (Login Credentials)
  const user = await User.create({ name, studentNumber, email: email.toLowerCase(), passwordHash });
  
  // 2. Automatically create the linked Borrower profile (Library Rules & Standing)
  await Borrower.create({
    name,
    studentNumber,
    email: email.toLowerCase(),
    type: "student", // Defaults to student. Admins can manually upgrade to faculty if needed.
    status: "active"
  });

  res.status(201).json({ token: createToken(user), user: userResponse(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, "Email and password are required");
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, "Incorrect email or password");
  res.json({ token: createToken(user), user: userResponse(user) });
}

async function me(req, res) {
  res.json({ user: userResponse(req.user) });
}

module.exports = { register, login, me };