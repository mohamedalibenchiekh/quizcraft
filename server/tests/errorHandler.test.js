import { describe, it, expect, vi } from "vitest";
import errorHandler from "../middleware/errorHandler.js";

describe("Global Error Handler", () => {
  const buildRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("should return 400 for Mongoose CastError", () => {
    const err = new Error("Cast to ObjectId failed");
    err.name = "CastError";
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Invalid ID format" })
    );
  });

  it("should return 400 for Mongoose ValidationError", () => {
    const err = new Error("Quiz validation failed");
    err.name = "ValidationError";
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it("should return 409 for MongoDB duplicate key error (code 11000)", () => {
    const err = new Error("Duplicate key");
    err.code = 11000;
    err.keyValue = { email: "test@test.com" };
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Duplicate value for email" })
    );
  });

  it("should return 500 for generic errors in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const err = new Error("Something broke");
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Internal Server Error" })
    );
    process.env.NODE_ENV = originalEnv;
  });

  it("should include stack trace in development mode", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const err = new Error("Dev error");
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg).toHaveProperty("stack");
    process.env.NODE_ENV = originalEnv;
  });

  it("should use err.statusCode if present", () => {
    const err = new Error("Custom error");
    err.statusCode = 422;
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Custom error" })
    );
  });
});
