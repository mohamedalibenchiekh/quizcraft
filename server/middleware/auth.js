import jwt from "jsonwebtoken";

/**
 * Middleware: verifies the JWT from the Authorization header.
 * Attaches the decoded payload to `req.user`.
 */
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized — no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user claims to the request object
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized — token invalid or expired" });
  }
};

/**
 * Middleware factory: blocks requests unless `req.user.role`
 * matches the required role.
 *
 * Usage:  router.post("/", protect, requireRole("professor"), handler);
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Forbidden — requires '${role}' role`,
      });
    }

    next();
  };
};
