export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with this value already exists." });
  }

  res.status(error.status || 500).json({
    message: error.message || "Something went wrong on the server."
  });
}
