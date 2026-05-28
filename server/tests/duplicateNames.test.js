import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import { io as ioc } from "socket.io-client";
import { initSocket } from "../config/socket.js";
import Session from "../models/Session.js";
import Quiz from "../models/Quiz.js";

process.env.JWT_SECRET = "supersecretfortesting";

const PIN = "OYSBHF";
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

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  hostId = new mongoose.Types.ObjectId();
  hostToken = jwt.sign({ id: hostId.toString(), role: "professor" }, process.env.JWT_SECRET);

  const quiz = await Quiz.create({
    title: "Duplicate Name Test",
    description: "Test for duplicate username rejection",
    professorId: hostId,
    questions: [],
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

describe("QC-BR-09 — Duplicate Username Rejection", () => {
  it("should reject a second player joining with the same username", async () => {
    const hostSocket = createClient();
    const playerSocket1 = createClient();
    const playerSocket2 = createClient();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(playerSocket1, "connect"),
      waitForEvent(playerSocket2, "connect"),
    ]);

    hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
    await Promise.all([
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(hostSocket, "room-roster-updated"),
    ]);

    const rosterAfterFirst = waitForEvent(hostSocket, "room-roster-updated");
    playerSocket1.emit("joinRoom", { pin: PIN, username: "Alex" });
    const firstRoster = await rosterAfterFirst;
    const playerUsernames = firstRoster.filter((p) => p.role !== "host").map((p) => p.username);
    expect(playerUsernames).toContain("Alex");

    const joinRejectedPromise = waitForEvent(playerSocket2, "join-rejected");
    playerSocket2.emit("joinRoom", { pin: PIN, username: "Alex" });
    const rejection = await joinRejectedPromise;
    expect(rejection).toMatchObject({
      reason: "name_taken",
      message: expect.stringContaining("already taken"),
    });

    const rosterAfterSecond = new Promise((resolve) => {
      const onRoster = (data) => {
        hostSocket.off("room-roster-updated", onRoster);
        resolve(data);
      };
      hostSocket.on("room-roster-updated", onRoster);
      setTimeout(() => resolve(null), 500);
    });
    const finalRoster = await rosterAfterSecond;
    if (finalRoster) {
      const players = finalRoster.filter((p) => p.role !== "host");
      expect(players.length).toBe(1);
    }

    hostSocket.close();
    playerSocket1.close();
    playerSocket2.close();
  });

  it("should allow a second player with a different username", async () => {
    const hostSocket = createClient();
    const playerSocket1 = createClient();
    const playerSocket2 = createClient();

    await Promise.all([
      waitForEvent(hostSocket, "connect"),
      waitForEvent(playerSocket1, "connect"),
      waitForEvent(playerSocket2, "connect"),
    ]);

    hostSocket.emit("hostClaim", { pin: PIN, token: hostToken });
    await Promise.all([
      waitForEvent(hostSocket, "host-claimed"),
      waitForEvent(hostSocket, "room-roster-updated"),
    ]);

    const rosterAfterFirst = waitForEvent(hostSocket, "room-roster-updated");
    playerSocket1.emit("joinRoom", { pin: PIN, username: "Alice" });
    await rosterAfterFirst;

    const rosterAfterSecond = waitForEvent(hostSocket, "room-roster-updated");
    playerSocket2.emit("joinRoom", { pin: PIN, username: "Bob" });
    const finalRoster = await rosterAfterSecond;

    const players = finalRoster.filter((p) => p.role !== "host");
    expect(players.length).toBe(2);

    hostSocket.close();
    playerSocket1.close();
    playerSocket2.close();
  });
});
