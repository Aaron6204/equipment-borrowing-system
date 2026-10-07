const jwt = require("jsonwebtoken");
const User = require("../models/User");
const httpError = require("../utils/httpError");
const { getJwtSecret } = require("../config/auth");

async function requireAuth(req, res, next) {
  const header = req.get("Authorization");
  if (!header?.startsWith("Bearer ")) return next(httpError(401, "Please log in to access SEBS"));
  try {
    const payload = jwt.verify(header.slice(7), getJwtSecret());
    const user = await User.findById(payload.sub);
    if (!user) return next(httpError(401, "Your account no longer exists"));
    req.user = user;
    next();
  } catch {
    next(httpError(401, "Your session has expired. Please log in again"));
  }
}

module.exports = requireAuth;
