// JSON 404 catch-all for any path that no route handled.
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = notFound;
