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

let server;
let serverUrl;
let mongoServer;
let questionIds = [];
let hostToken;
let hostId;
let pinCounter = 0;
const nextPin = () => {
  pinCounter += 1;
  return String(555444 + pinCounter);
};

const createClient = () =>
  ioc(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
  });

const waitForEvent = (socket, event, timeout = 5000) =>
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

const setupClients = async (pin, numStudents = 1) => {
  const hostSocket = createClient();
  const studentSockets = Array.from({ length: numStudents }, () => createClient());

  await Promise.all([
    waitForEvent(hostSocket, "connect"),
    ...studentSockets.map((s) => waitForEvent(s, "connect")),
  ]);

  hostSocket.emit("hostClaim", { pin, token: hostToken });
  await Promise.all([
    waitForEvent(hostSocket, "host-claimed"),
    waitForEvent(hostSocket, "room-roster-updated"),
  ]);

  studentSockets.forEach((s, i) => {
    s.emit("joinRoom", { pin, username: `Player${i + 1}` });
  });

  await Promise.all([
    waitForEvent(hostSocket, "room-roster-updated"),
    ...studentSockets.map((s) => waitForEvent(s, "room-roster-updated")),
  ]);

  hostSocket.emit("startQuiz", { pin });
  await Promise.all(studentSockets.map((s) => waitForEvent(s, "quiz-started")));

  return { hostSocket, studentSockets };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  hostId = new mongoose.Types.ObjectId();
  hostToken = jwt.sign({ id: hostId.toString(), role: "professor" }, process.env.JWT_SECRET);

  const questionsData = [
    { text: "Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
    { text: "Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
    { text: "Q3", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
  ];

  const questions = await Question.create(questionsData);
  questionIds = questions.map((q) => q._id);

  const quiz = await Quiz.create({
    title: "Scoreboard Test",
    description: "Scoreboard tests",
    professorId: hostId,
    questions: questionIds,
  });

  await Session.create({ quizId: quiz._id, hostId, pin: nextPin(), status: "waiting" });
  await Session.create({ quizId: quiz._id, hostId, pin: nextPin(), status: "waiting" });
  await Session.create({ quizId: quiz._id, hostId, pin: nextPin(), status: "waiting" });
  // Reset counter so tests use sequential unique pins
  pinCounter = 0;

  server = http.createServer();
  initSocket(server);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      serverUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
}, 20000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

describe("QC-BR-04 — Real-Time Point Tracking & Scoreboard", () => {
  it("should award higher score to faster correct answer (speed differential)", async () => {
    const pin = nextPin();
    const { hostSocket, studentSockets } = await setupClients(pin, 2);
    const [p1, p2] = studentSockets;

    const reveal1 = waitForEvent(p1, "reveal-question");
    const reveal2 = waitForEvent(p2, "reveal-question");
    hostSocket.emit("nextQuestion", { pin, questionIndex: 0, durationMs: 10000 });
    await Promise.all([reveal1, reveal2]);

    p1.emit("submitAnswer", { pin, questionId: questionIds[0].toString(), chosenOption: "A" });
    await delay(1000);

    const resultsPromise = waitForEvent(p1, "reveal-question-results", 10000);
    p2.emit("submitAnswer", { pin, questionId: questionIds[0].toString(), chosenOption: "A" });

    const results = await resultsPromise;
    expect(results).toHaveProperty("correctAnswer", "A");
    expect(results).toHaveProperty("scoreboard");
    expect(results.scoreboard.length).toBe(2);
    expect(results.scoreboard[0].score).toBeGreaterThan(results.scoreboard[1].score);

    hostSocket.close();
    p1.close();
    p2.close();
  });

  it("should apply streak bonus on third consecutive correct answer", async () => {
    const pin = nextPin();
    const { hostSocket, studentSockets } = await setupClients(pin, 1);
    const [p1] = studentSockets;

    let reveal = waitForEvent(p1, "reveal-question");
    hostSocket.emit("nextQuestion", { pin, questionIndex: 0, durationMs: 10000 });
    await reveal;

    const results1 = waitForEvent(p1, "reveal-question-results");
    p1.emit("submitAnswer", { pin, questionId: questionIds[0].toString(), chosenOption: "A" });
    let res1 = await results1;
    expect(res1.scoreboard[0].score).toBeGreaterThan(0);
    const scoreAfterQ1 = res1.scoreboard[0].score;

    reveal = waitForEvent(p1, "reveal-question");
    hostSocket.emit("nextQuestion", { pin, questionIndex: 1, durationMs: 10000 });
    await reveal;

    const results2 = waitForEvent(p1, "reveal-question-results");
    p1.emit("submitAnswer", { pin, questionId: questionIds[1].toString(), chosenOption: "A" });
    let res2 = await results2;
    const scoreAfterQ2 = res2.scoreboard[0].score;
    expect(scoreAfterQ2).toBeGreaterThan(scoreAfterQ1);

    reveal = waitForEvent(p1, "reveal-question");
    hostSocket.emit("nextQuestion", { pin, questionIndex: 2, durationMs: 10000 });
    await reveal;

    const results3 = waitForEvent(p1, "reveal-question-results");
    p1.emit("submitAnswer", { pin, questionId: questionIds[2].toString(), chosenOption: "A" });
    let res3 = await results3;
    const scoreAfterQ3 = res3.scoreboard[0].score;
    expect(scoreAfterQ3).toBeGreaterThan(scoreAfterQ2);
    expect(scoreAfterQ3 - scoreAfterQ2).toBeGreaterThan(scoreAfterQ2 - scoreAfterQ1);

    hostSocket.close();
    p1.close();
  }, 20000);

  it("should emit leaderboard sorted in descending score order", async () => {
    const pin = nextPin();
    const { hostSocket, studentSockets } = await setupClients(pin, 3);
    const [p1, p2, p3] = studentSockets;

    const reveals = [
      waitForEvent(p1, "reveal-question"),
      waitForEvent(p2, "reveal-question"),
      waitForEvent(p3, "reveal-question"),
    ];
    hostSocket.emit("nextQuestion", { pin, questionIndex: 0, durationMs: 10000 });
    await Promise.all(reveals);

    await delay(1000);
    p1.emit("submitAnswer", { pin, questionId: questionIds[0].toString(), chosenOption: "A" });
    await delay(2000);
    p2.emit("submitAnswer", { pin, questionId: questionIds[0].toString(), chosenOption: "A" });

    const resultsPromise = waitForEvent(p1, "reveal-question-results", 15000);
    await delay(3000);
    p3.emit("submitAnswer", { pin, questionId: questionIds[0].toString(), chosenOption: "A" });

    const resultsPayload = await resultsPromise;
    expect(resultsPayload).toHaveProperty("scoreboard");
    expect(resultsPayload.scoreboard.length).toBe(3);

    for (let i = 1; i < resultsPayload.scoreboard.length; i++) {
      expect(resultsPayload.scoreboard[i - 1].score).toBeGreaterThanOrEqual(resultsPayload.scoreboard[i].score);
    }

    hostSocket.close();
    p1.close();
    p2.close();
    p3.close();
  }, 20000);
});
