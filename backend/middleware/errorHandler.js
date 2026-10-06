// Central error handler. Every error ends up here and is sent back
// in one consistent format: { "message": "..." }
// Controllers do not need try/catch: Express 5 passes any error thrown
// inside an async function to this middleware.
function errorHandler(err, req, res, next) {
  // Mongoose schema validation failed (required, min, enum, ...)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }

  // An ID in the URL or body is not a valid MongoDB ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  // A unique field was duplicated (for example, the same student number)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || "value";
    return res.status(400).json({ message: `That ${field} already exists` });
  }

  // The request body is not valid JSON
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body is not valid JSON" });
  }

  // Errors we threw on purpose with a status code (see utils/httpError.js)
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  // Anything else is an unexpected server error
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
}

module.exports = errorHandler;
