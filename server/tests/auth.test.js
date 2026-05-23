import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { authenticateToken, requireRole } from "../middleware/auth.js";

// Make sure process.env has a mock secret
process.env.JWT_SECRET = "supersecretfortesting";

describe("Auth Middleware Tests", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe("authenticateToken", () => {
    it("should return 401 if no authorization header is passed", () => {
      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Unauthorized"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is not formatted with Bearer prefix", () => {
      req.headers.authorization = "Token mysecrettoken";

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Unauthorized"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 if token is invalid or expired", () => {
      req.headers.authorization = "Bearer invalidtokenhere";

      authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Forbidden"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should proceed to next middleware and populate req.user with valid JWT payload", () => {
      const payload = { id: "user123", email: "test@test.com", role: "professor" };
      const validToken = jwt.sign(payload, process.env.JWT_SECRET);
      
      req.headers.authorization = `Bearer ${validToken}`;

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(payload.id);
      expect(req.user.role).toBe(payload.role);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    it("should return 401 if req.user is absent (auth token not parsed)", () => {
      const middleware = requireRole("professor");
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Unauthorized"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 if requireRole('professor') is called but req.user has role: 'student'", () => {
      req.user = { id: "student123", role: "student" };
      
      const middleware = requireRole("professor");
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Forbidden"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("should proceed to next middleware if user has the matching role claim", () => {
      req.user = { id: "prof123", role: "professor" };

      const middleware = requireRole("professor");
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
