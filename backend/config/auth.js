const crypto = require("crypto");

// Local development remains usable even when a terminal was started before
// .env was saved. Production must always provide JWT_SECRET explicitly.
const developmentSecret = crypto.randomBytes(48).toString("hex");

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }
  return developmentSecret;
}

module.exports = { getJwtSecret };
