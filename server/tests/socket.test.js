import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { io as ioc } from "socket.io-client";
import { initSocket } from "../config/socket.js";

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
  it("should reject a joinRoom attempt when no host is present", async () => {
    const client = createClient();
    await waitForEvent(client, "connect");

    const errPromise = waitForEvent(client, "session-error");
    client.emit("joinRoom", { pin: "999888", username: "GhostHunter" });

    const err = await errPromise;
    expect(err).toMatchObject({
      message: expect.stringContaining("no longer active"),
    });

    client.close();
  });

  it("should reject joinRoom with invalid PIN format", async () => {
    const client = createClient();
    await waitForEvent(client, "connect");

    const errPromise = waitForEvent(client, "join-error");
    client.emit("joinRoom", { pin: "SHORT", username: "Bad" });

    const err = await errPromise;
    expect(err).toMatchObject({
      message: expect.stringContaining("Invalid"),
    });

    client.close();
  });
});
