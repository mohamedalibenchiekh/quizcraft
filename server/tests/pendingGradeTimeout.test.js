import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "http";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import { io as ioc } from "socket.io-client";
import Session from "../models/Session.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

vi.mock("../services/shortAnswerEvaluator.js", () => ({
  evaluateShortAnswer: vi.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            isCorrect: true,
            feedback: "Semantic grading completed.",
          });
        }, 800);
      })
  ),
}));

const { initSocket } = await import("../config/socket.js");

const PIN = "232323";
let server;
let serverUrl;
let mongoServer;
let hostToken;
let hostId;
let questionIds = [];

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

const setupClients = async () => {
  const hostSocket = createClient();
  const p1 = createClient();
  const p2 = createClient();

  await Promise.all([
    waitForEvent(hostSocket, "connect"),
    waitForEvent(p1, "connect"),
    waitForEvent(p2, "connect"),
  ]);

  hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
  await Promise.all([
    waitForEvent(hostSocket, "host-claimed"),
    waitForEvent(hostSocket, "room-roster-updated"),
  ]);

  p1.emit("joinRoom", { pin: PIN, username: "Player1" });
  p2.emit("joinRoom", { pin: PIN, username: "Player2" });
  await Promise.all([
    waitForEvent(hostSocket, "room-roster-updated"),
    waitForEvent(p1, "room-roster-updated"),
    waitForEvent(p2, "room-roster-updated"),
  ]);

  hostSocket.emit("startQuiz", { pin: PIN });
  await Promise.all([waitForEvent(p1, "quiz-started"), waitForEvent(p2, "quiz-started")]);

  return { hostSocket, p1, p2 };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  hostId = new mongoose.Types.ObjectId();
  hostToken = jwt.sign({ id: hostId.toString(), role: "professor" }, process.env.JWT_SECRET);

  const questions = await Question.create([
    { text: "Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
    { text: "Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
    {
      text: "Name one type of bias.",
      type: "Short-Answer",
      options: [],
      correctAnswer: "Labeling Bias",
      difficulty: "medium",
    },
    { text: "Q4", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
  ]);
  questionIds = questions.map((q) => q._id);

  const quiz = await Quiz.create({
    title: "Pending Grade Timeout",
    description: "Checks unanswered streak reset after pending grading",
    professorId: hostId,
    questions: questionIds,
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
}, 20000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

describe("pending semantic grade timeout handling", () => {
  it("resets unanswered player streaks when results reveal after a pending grade finishes post-timeout", async () => {
    const { hostSocket, p1, p2 } = await setupClients();

    for (let questionIndex = 0; questionIndex < 2; questionIndex += 1) {
      const reveal1 = waitForEvent(p1, "reveal-question");
      const reveal2 = waitForEvent(p2, "reveal-question");
      hostSocket.emit("nextQuestion", { pin: PIN, questionIndex, durationMs: 10000 });
      await Promise.all([reveal1, reveal2]);

      const results = waitForEvent(p1, "reveal-question-results");
      p1.emit("submitAnswer", { pin: PIN, questionId: questionIds[questionIndex].toString(), chosenOption: "A" });
      p2.emit("submitAnswer", { pin: PIN, questionId: questionIds[questionIndex].toString(), chosenOption: "A" });
      await results;
    }

    const shortReveal1 = waitForEvent(p1, "reveal-question");
    const shortReveal2 = waitForEvent(p2, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 2, durationMs: 20 });
    await Promise.all([shortReveal1, shortReveal2]);

    const timedResults = waitForEvent(p1, "reveal-question-results");
    p1.emit("submitAnswer", {
      pin: PIN,
      questionId: questionIds[2].toString(),
      chosenOption: "Labeling Bias",
    });
    const timedPayload = await timedResults;
    const timedP2 = timedPayload.scoreboard.find((entry) => entry.username === "Player2");
    expect(timedP2.currentStreak).toBe(0);

    const finalReveal1 = waitForEvent(p1, "reveal-question");
    const finalReveal2 = waitForEvent(p2, "reveal-question");
    hostSocket.emit("nextQuestion", { pin: PIN, questionIndex: 3, durationMs: 10000 });
    await Promise.all([finalReveal1, finalReveal2]);

    const finalResults = waitForEvent(p1, "reveal-question-results");
    p1.emit("submitAnswer", { pin: PIN, questionId: questionIds[3].toString(), chosenOption: "A" });
    p2.emit("submitAnswer", { pin: PIN, questionId: questionIds[3].toString(), chosenOption: "A" });
    const finalPayload = await finalResults;

    const finalP2 = finalPayload.scoreboard.find((entry) => entry.username === "Player2");
    expect(finalP2.currentStreak).toBe(1);

    hostSocket.close();
    p1.close();
    p2.close();
  }, 20000);
});
