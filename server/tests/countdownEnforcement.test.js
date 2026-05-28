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

const PIN = "888777";
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

const waitForEvent = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for "${event}"`));
    }, timeout);
    socket.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args.length <= 1 ? args[0] : args);
    });
  });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setupClients = async () => {
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

describe("QC-BR-03 — Socket.io Countdown Enforcement", () => {
  it("should accept an on-time answer submitted before the question deadline", async () => {
    const { hostSocket, studentSocket } = await setupClients();

    const revealPromise = waitForEvent(studentSocket, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 0, durationMs: 5000 });
    await revealPromise;

    const ackPromise = waitForEvent(studentSocket, "answer-acknowledged");
    studentSocket.emit("submitAnswer", {
      pin: PIN,
      questionId: questionId.toString(),
      chosenOption: "Paris",
    });
    const ack = await ackPromise;

    expect(ack).toMatchObject({
      questionId: questionId.toString(),
      correct: true,
      score: expect.any(Number),
      pointsAwarded: expect.any(Number),
    });
    expect(ack.score).toBeGreaterThan(0);

    hostSocket.close();
    studentSocket.close();
  });

  it("should reject a late answer submitted after the question deadline", async () => {
    const { hostSocket, studentSocket } = await setupClients();

    const revealPromise = waitForEvent(studentSocket, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 0, durationMs: 10 });
    await revealPromise;

    await delay(700);

    const rejectPromise = waitForEvent(studentSocket, "answer-rejected");
    studentSocket.emit("submitAnswer", {
      pin: PIN,
      questionId: questionId.toString(),
      chosenOption: "Paris",
    });
    const rejection = await rejectPromise;

    expect(rejection).toMatchObject({
      reason: "timeout",
      pointsAwarded: 0,
    });

    hostSocket.close();
    studentSocket.close();
  });
});
