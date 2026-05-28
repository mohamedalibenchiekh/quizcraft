import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import { io as ioc } from "socket.io-client";
import { initSocket } from "../config/socket.js";
import Session from "../models/Session.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

const PIN = "444555";
let server;
let serverUrl;
let mongoServer;
let questionId;
let hostToken;
let hostId;

const createClient = () =>
  ioc(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
  });

const waitForEvent = (socket, event, timeout = 7000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${event}"`));
    }, timeout);
    socket.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args.length <= 1 ? args[0] : args);
    });
  });

const setupRoom = async () => {
  const hostSocket = createClient();
  const studentSocket = createClient();

  await Promise.all([
    waitForEvent(hostSocket, "connect"),
    waitForEvent(studentSocket, "connect"),
  ]);

  hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
  await Promise.all([
    waitForEvent(hostSocket, "host-claimed"),
    waitForEvent(hostSocket, "room-roster-updated"),
  ]);

  studentSocket.emit("joinRoom", { pin: PIN, username: "Tester" });
  await Promise.all([
    waitForEvent(hostSocket, "room-roster-updated"),
    waitForEvent(studentSocket, "room-roster-updated"),
  ]);

  hostSocket.emit("startQuiz", { pin: PIN });
  await waitForEvent(studentSocket, "quiz-started");

  return { hostSocket, studentSocket };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  hostId = new mongoose.Types.ObjectId();
  hostToken = jwt.sign({ id: hostId.toString(), role: "professor" }, process.env.JWT_SECRET);

  const question = await Question.create({
    text: "What is the capital of France?",
    type: "MCQ",
    options: ["London", "Paris", "Berlin", "Madrid"],
    correctAnswer: "Paris",
    difficulty: "easy",
  });
  questionId = question._id;

  const quiz = await Quiz.create({
    title: "Geography",
    description: "Capital cities",
    professorId: hostId,
    questions: [question._id],
  });

  await Session.create({
    quizId: quiz._id,
    hostId,
    pin: PIN,
    status: "waiting",
  });

  server = http.createServer();
  initSocket(server);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      serverUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

describe("QC-BR-05 — Delayed Results & Payload Completeness", () => {
  it("Test Case 1 (Payload Completeness): reveal-question carries non-empty question text and no correctAnswer", async () => {
    const { hostSocket, studentSocket } = await setupRoom();

    const revealPromise = waitForEvent(studentSocket, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 0, durationMs: 10000 });
    const payload = await revealPromise;

    expect(payload).toHaveProperty("text");
    expect(payload.text).toBe("What is the capital of France?");
    expect(payload.text.length).toBeGreaterThan(0);
    expect(payload).toHaveProperty("options");
    expect(payload.options.length).toBeGreaterThan(0);
    expect(payload).not.toHaveProperty("correctAnswer");

    hostSocket.close();
    studentSocket.close();
  });

  it("Test Case 2 (Delayed Evaluation Integrity): answer-received has NO correctness flags; correctness arrives only in reveal-question-results", async () => {
    const { hostSocket, studentSocket } = await setupRoom();

    const revealPromise = waitForEvent(studentSocket, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 0, durationMs: 10000 });
    await revealPromise;

    const receivedPromise = waitForEvent(studentSocket, "answer-received");
    const resultsPromise = waitForEvent(studentSocket, "reveal-question-results");

    studentSocket.emit("submitAnswer", {
      pin: PIN,
      questionId: questionId.toString(),
      chosenOption: "Paris",
    });

    const received = await receivedPromise;
    expect(received).not.toHaveProperty("correct");
    expect(received).not.toHaveProperty("score");
    expect(received).not.toHaveProperty("pointsAwarded");
    expect(received).not.toHaveProperty("speedPoints");
    expect(received).not.toHaveProperty("streakBonus");
    expect(received).toHaveProperty("questionId");
    expect(received.questionId).toBe(questionId.toString());

    const results = await resultsPromise;
    expect(results).toHaveProperty("correctAnswer");
    expect(results.correctAnswer).toBe("Paris");
    expect(results).toHaveProperty("scoreboard");
    expect(Array.isArray(results.scoreboard)).toBe(true);

    hostSocket.close();
    studentSocket.close();
  });
});
