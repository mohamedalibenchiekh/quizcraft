/**
 * Global catch-all error handler.
 * Express recognises it by the 4-parameter signature (err, req, res, next).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  console.error("💥  Unhandled Error:", err.stack || err.message);

  // Map Mongoose CastError (invalid ObjectId) to 400 Bad Request
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  // Map Mongoose ValidationError to 400 Bad Request
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Map MongoDB duplicate key error (code 11000) to 409 Conflict
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
  }

  const statusCode = err.statusCode || 500;
  const message =
    statusCode >= 500 && process.env.NODE_ENV !== "development"
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
