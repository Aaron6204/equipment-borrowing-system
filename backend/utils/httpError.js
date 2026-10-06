// Creates an error that carries an HTTP status code.
// Usage: throw httpError(404, "Equipment not found");
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = httpError;
