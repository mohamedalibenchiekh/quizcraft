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

const HOST_PIN = "TEST12";
const GHOST_PIN = "GHOST1";
let server;
let serverUrl;
let mongoServer;
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

const waitForConnect = (socket) => waitForEvent(socket, "connect");

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  hostId = new mongoose.Types.ObjectId();
  hostToken = jwt.sign({ id: hostId.toString(), role: "professor" }, process.env.JWT_SECRET);

  const question = await Question.create({
    text: "Sample question?",
    type: "MCQ",
    options: ["A", "B", "C", "D"],
    correctAnswer: "A",
    difficulty: "easy",
  });

  const quiz = await Quiz.create({
    title: "Cleanup Test Quiz",
    description: "For session lifecycle tests",
    professorId: hostId,
    questions: [question._id],
  });

  await Session.create({
    quizId: quiz._id,
    hostId,
    pin: HOST_PIN,
    status: "waiting",
  });

  await Session.create({
    quizId: quiz._id,
    hostId,
    pin: GHOST_PIN,
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

describe("Session Lifecycle Cleanup", () => {
  it("should broadcast room-terminated and mark session completed when host disconnects", async () => {
    const hostSocket = createClient();
    const studentSocket = createClient();

    await Promise.all([
      waitForConnect(hostSocket),
      waitForConnect(studentSocket),
    ]);

    hostSocket.emit("hostClaim", { pin: HOST_PIN, token: hostToken });
    await Promise.all([
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(hostSocket, "room-roster-updated"),
    ]);

    studentSocket.emit("joinRoom", { pin: HOST_PIN, username: "Alice" });
    await waitForEvent(studentSocket, "room-roster-updated");

    const terminationPromise = waitForEvent(studentSocket, "room-terminated");

    hostSocket.close();

    const terminationPayload = await terminationPromise;
    expect(terminationPayload).toMatchObject({
      message: expect.stringContaining("host has disconnected"),
    });

    const sessionInDb = await Session.findOne({ pin: HOST_PIN });
    expect(sessionInDb.status).toBe("completed");

    studentSocket.close();
  });

  it("should reject a student joining a room with no active host", async () => {
    const studentSocket = createClient();
    await waitForConnect(studentSocket);

    const errorPromise = waitForEvent(studentSocket, "session-error");
    studentSocket.emit("joinRoom", { pin: GHOST_PIN, username: "Bob" });

    const errorPayload = await errorPromise;
    expect(errorPayload).toMatchObject({
      message: expect.stringContaining("no longer active"),
    });

    studentSocket.close();
  });

  it("should reject joining a room with an invalid PIN format", async () => {
    const studentSocket = createClient();
    await waitForConnect(studentSocket);

    const errorPromise = waitForEvent(studentSocket, "join-error");
    studentSocket.emit("joinRoom", { pin: "SHORT", username: "Bad" });

    const errorPayload = await errorPromise;
    expect(errorPayload).toMatchObject({
      message: expect.stringContaining("Invalid"),
    });

    studentSocket.close();
  });

  it("should terminate room and evict all sockets when host emits cancelSession", async () => {
    const hostSocket = createClient();
    const studentSocket = createClient();

    await Promise.all([
      waitForConnect(hostSocket),
      waitForConnect(studentSocket),
    ]);

    const cancelPin = "CNCL01";

    await Session.create({
      quizId: new mongoose.Types.ObjectId(),
      hostId,
      pin: cancelPin,
      status: "waiting",
    });

    hostSocket.emit("hostClaim", { pin: cancelPin, token: hostToken });
    await Promise.all([
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(hostSocket, "room-roster-updated"),
    ]);

    studentSocket.emit("joinRoom", { pin: cancelPin, username: "Charlie" });
    await waitForEvent(studentSocket, "room-roster-updated");

    const terminationPromise = waitForEvent(studentSocket, "room-terminated");
    hostSocket.emit("cancelSession", { pin: cancelPin });

    const payload = await terminationPromise;
    expect(payload).toMatchObject({
      message: expect.stringContaining("cancelled"),
    });

    const sessionInDb = await Session.findOne({ pin: cancelPin });
    expect(sessionInDb.status).toBe("completed");

    hostSocket.close();
    studentSocket.close();
  });
});
