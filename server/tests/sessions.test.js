import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("Session Controller (Stubbed - Phase 3)", () => {
  let mongoServer;
  let professorToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    professorToken = jwt.sign(
      { id: "prof-001", role: "professor" },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("POST /api/sessions/start", () => {
    it("should return 501 Not Implemented", async () => {
      const res = await request(app)
        .post("/api/sessions/start")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ quizId: "64f1a2b3c4d5e6f7a8b9c0e1" });

      expect(res.status).toBe(501);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not yet implemented/i);
    });
  });

  describe("POST /api/sessions/answer", () => {
    it("should return 501 Not Implemented", async () => {
      const res = await request(app)
        .post("/api/sessions/answer")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ sessionId: "session_1", questionIndex: 0, answer: "A" });

      expect(res.status).toBe(501);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not yet implemented/i);
    });
  });
});
