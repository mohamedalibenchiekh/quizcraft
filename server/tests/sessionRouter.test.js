import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Session from "../models/Session.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("Session Router — POST /api/sessions/start", () => {
  let mongoServer;
  let professorToken;
  let studentToken;
  let validQuizId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    const professorId = new mongoose.Types.ObjectId();
    const studentId = new mongoose.Types.ObjectId();
    validQuizId = new mongoose.Types.ObjectId();

    professorToken = jwt.sign(
      { id: professorId.toString(), role: "professor" },
      process.env.JWT_SECRET
    );

    studentToken = jwt.sign(
      { id: studentId.toString(), role: "student" },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it("should create a session and return a 6-character PIN when a valid professor token and quizId are provided", async () => {
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${professorToken}`)
      .send({ quizId: validQuizId.toString() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pin).toBeDefined();
    expect(res.body.data.pin).toHaveLength(6);
    expect(res.body.data.quizId).toBe(validQuizId.toString());
    expect(res.body.data.status).toBe("waiting");
    expect(res.body.data.hostId).toBeDefined();

    const sessionInDb = await Session.findById(res.body.data._id);
    expect(sessionInDb).not.toBeNull();
    expect(sessionInDb.pin).toBe(res.body.data.pin);
  });

  it("should return 400 when quizId is missing from the request body", async () => {
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${professorToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/quizId.*required/i);
  });

  it("should return 400 when quizId is not a valid ObjectId", async () => {
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${professorToken}`)
      .send({ quizId: "not-an-object-id" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/valid.*ObjectId/i);
  });

  it("should return 403 when a student role token attempts to start a session", async () => {
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ quizId: validQuizId.toString() });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Forbidden");
  });

  it("should return 401 when no authorization token is provided", async () => {
    const res = await request(app)
      .post("/api/sessions/start")
      .send({ quizId: validQuizId.toString() });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Unauthorized");
  });
});
