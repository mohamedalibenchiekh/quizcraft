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

const PIN = "999888";
const ALT_PIN = "111222";
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

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  hostId = new mongoose.Types.ObjectId();
  hostToken = jwt.sign({ id: hostId.toString(), role: "professor" }, process.env.JWT_SECRET);

  const question = await Question.create({
    text: "What is 2 + 2?",
    type: "MCQ",
    options: ["3", "4", "5", "6"],
    correctAnswer: "4",
    difficulty: "easy",
  });
  questionId = question._id;

  const quiz = await Quiz.create({
    title: "Math Test",
    description: "Basic arithmetic",
    professorId: hostId,
    questions: [question._id],
  });

  await Session.create({
    quizId: quiz._id,
    hostId,
    pin: PIN,
    status: "waiting",
  });

  await Session.create({
    quizId: quiz._id,
    hostId,
    pin: ALT_PIN,
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

describe("Socket.io Live Quiz Orchestration", () => {
  it("should sync room roster when multiple students join via joinRoom", async () => {
    const hostSocket = createClient();
    const student1 = createClient();
    const student2 = createClient();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(student1, "connect"),
      waitForEvent(student2, "connect"),
    ]);

    hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
    const [hostClaimRoster] = await Promise.all([
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(hostSocket, "host-claimed"),
    ]);
    expect(hostClaimRoster).toHaveLength(1);

    const rosterS1 = waitForEvent(student1, "room-roster-updated");
    const rosterHostAgain = waitForEvent(hostSocket, "room-roster-updated");
    student1.emit("joinRoom", { pin: PIN, username: "Alice" });
    await Promise.all([rosterS1, rosterHostAgain]);

    const rosterS2 = waitForEvent(student2, "room-roster-updated");
    student2.emit("joinRoom", { pin: PIN, username: "Bob" });
    const finalRoster = await rosterS2;

    expect(finalRoster).toHaveLength(3);
    const usernames = finalRoster.map((p) => p.username);
    expect(usernames).toContain("Alice");
    expect(usernames).toContain("Bob");

    hostSocket.close();
    student1.close();
    student2.close();
  });

  it("should strip correctAnswer from reveal-question payload when host emits nextQuestion", async () => {
    const hostSocket = createClient();
    const studentSocket = createClient();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(studentSocket, "connect"),
    ]);

    hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
    studentSocket.emit("joinRoom", { pin: PIN, username: "Alice" });
    await Promise.all([
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(studentSocket, "room-roster-updated"),
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(studentSocket, "room-roster-updated"),
    ]);

    hostSocket.emit("startQuiz", { pin: PIN });
    await waitForEvent(studentSocket, "quiz-started");

    const revealPromise = waitForEvent(studentSocket, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 0 });
    const questionPayload = await revealPromise;

    expect(questionPayload).not.toHaveProperty("correctAnswer");
    expect(questionPayload.text).toBe("What is 2 + 2?");
    expect(questionPayload.options).toEqual(["3", "4", "5", "6"]);
    expect(questionPayload.difficulty).toBe("easy");

    hostSocket.close();
    studentSocket.close();
  });

  it("should acknowledge answer submission with correctness and updated score", async () => {
    const hostSocket = createClient();
    const studentSocket = createClient();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(studentSocket, "connect"),
    ]);

    hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
    studentSocket.emit("joinRoom", { pin: PIN, username: "Alice" });
    await Promise.all([
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(studentSocket, "room-roster-updated"),
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(studentSocket, "room-roster-updated"),
    ]);

    hostSocket.emit("startQuiz", { pin: PIN });
    await waitForEvent(studentSocket, "quiz-started");

    const revealPromise = waitForEvent(studentSocket, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 0, durationMs: 10000 });
    await revealPromise;

    const ackPromise = waitForEvent(studentSocket, "answer-acknowledged");
    studentSocket.emit("submitAnswer", {
      pin: PIN,
      questionId: questionId.toString(),
      chosenOption: "4",
    });
    const ack = await ackPromise;

    expect(ack).toMatchObject({
      questionId: questionId.toString(),
      correct: true,
      score: expect.any(Number),
      pointsAwarded: expect.any(Number),
    });
    expect(ack.score).toBeGreaterThan(0);

    const dupErr = waitForEvent(studentSocket, "submit-error");
    studentSocket.emit("submitAnswer", {
      pin: PIN,
      questionId: questionId.toString(),
      chosenOption: "3",
    });
    const dupPayload = await dupErr;
    expect(dupPayload).toMatchObject({ message: expect.stringContaining("already answered") });

    hostSocket.close();
    studentSocket.close();
  });

  it("should terminate room and evict all sockets when host emits roomClosed", async () => {
    const hostSocket = createClient();
    const student1 = createClient();
    const student2 = createClient();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(student1, "connect"),
      waitForEvent(student2, "connect"),
    ]);

    hostSocket.emit("hostClaim", { pin: ALT_PIN, token: hostToken });
    student1.emit("joinRoom", { pin: ALT_PIN, username: "Alice" });
    student2.emit("joinRoom", { pin: ALT_PIN, username: "Bob" });
    await Promise.all([
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(student1, "room-roster-updated"),
      waitForEvent(student2, "room-roster-updated"),
      waitForEvent(hostSocket, "room-roster-updated"),
      waitForEvent(student1, "room-roster-updated"),
      waitForEvent(student2, "room-roster-updated"),
    ]);

    const term1 = waitForEvent(student1, "quiz-terminated");
    const term2 = waitForEvent(student2, "quiz-terminated");
    hostSocket.emit("roomClosed", { pin: ALT_PIN });

    const [payload1, payload2] = await Promise.all([term1, term2]);
    expect(payload1).toMatchObject({ message: expect.stringContaining("terminated") });
    expect(payload2).toMatchObject({ message: expect.stringContaining("terminated") });

    const sessionInDb = await Session.findOne({ pin: ALT_PIN });
    expect(sessionInDb.status).toBe("completed");

    hostSocket.close();
    student1.close();
    student2.close();
  });
});
