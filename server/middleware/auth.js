import jwt from "jsonwebtoken";

// ─── authenticateToken ────────────────────────────────────────────────────────
/**
 * Primary token-parsing middleware.
 *
 * Extracts the JWT from the `Authorization: Bearer <token>` header, verifies
 * it against JWT_SECRET, and attaches the decoded payload to `req.user`.
 *
 * Status semantics:
 *   401 Unauthorized — token is absent or header is malformed.
 *   403 Forbidden    — token is present but invalid or expired.
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // ── 1. Presence check ─────────────────────────────────────────────────────
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized — no bearer token provided.",
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized — no bearer token provided.",
    });
  }

  // ── 2. Verification ───────────────────────────────────────────────────────
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (error) {
    // Token present but tampered, expired, or signed with wrong secret
    return res.status(403).json({
      success: false,
      message: "Forbidden — token is invalid or has expired.",
    });
  }
};

// ─── requireRole ──────────────────────────────────────────────────────────────
/**
 * Higher-order role verification guard.
 *
 * Returns an Express middleware that asserts `req.user.role === role`.
 * Must be chained *after* `authenticateToken` so that `req.user` is populated.
 *
 * Usage:
 *   router.post("/", authenticateToken, requireRole("professor"), handler);
 *
 * @param {string} role - The role string to enforce (e.g. 'professor', 'student').
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    // Guard: authenticateToken must always run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — authentication required.",
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Forbidden — this endpoint requires the '${role}' role. Your current role is '${req.user.role}'.`,
      });
    }

    next();
  };
};
