import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { io as ioc } from "socket.io-client";
import { initSocket } from "../config/socket.js";

const PIN = "123456";
let server;
let serverUrl;

const createClient = () =>
  ioc(serverUrl, {
    transports: ["websocket"],
    forceNew: true,
  });

const waitForEvent = (socket, event, timeout = 2000) =>
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

afterAll(() => {
  server.close();
});

describe("Socket.io Real-Time Engine", () => {
  it("should handshake and exchange room-join notifications between two clients", async () => {
    const client1 = createClient();
    const client2 = createClient();

    await Promise.all([
      waitForEvent(client1, "connect"),
      waitForEvent(client2, "connect"),
    ]);

    const userJoined1 = waitForEvent(client1, "user-joined");
    client1.emit("join-session", { pin: PIN, username: "Professor" });
    await userJoined1;

    const userJoined2 = waitForEvent(client2, "user-joined");
    const userJoined1Again = waitForEvent(client1, "user-joined");
    client2.emit("join-session", { pin: PIN, username: "Student" });
    const [joined2Payload, joined1AgainPayload] = await Promise.all([
      userJoined2,
      userJoined1Again,
    ]);

    expect(joined2Payload).toMatchObject({
      socketId: client2.id,
      username: "Student",
    });
    expect(joined1AgainPayload).toMatchObject({
      socketId: client2.id,
      username: "Student",
    });

    client1.close();
    client2.close();
  });

  it("should forward broadcast events from professor to student in the same room", async () => {
    const client1 = createClient();
    const client2 = createClient();

    await Promise.all([
      waitForEvent(client1, "connect"),
      waitForEvent(client2, "connect"),
    ]);

    client1.emit("join-session", { pin: PIN, username: "Professor" });
    client2.emit("join-session", { pin: PIN, username: "Student" });
    await Promise.all([
      waitForEvent(client1, "user-joined"),
      waitForEvent(client2, "user-joined"),
      waitForEvent(client1, "user-joined"),
    ]);

    const quizStarted = waitForEvent(client2, "quiz-started");
    client1.emit("start-quiz", { pin: PIN });

    await expect(quizStarted).resolves.toBeUndefined();

    client1.close();
    client2.close();
  });
});
