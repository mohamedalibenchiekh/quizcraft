import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { io as ioc } from "socket.io-client";
import { initSocket } from "../config/socket.js";

const PIN = "999888";
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
  it("should connect and exchange room-roster-updated events when clients joinRoom", async () => {
    const client1 = createClient();
    const client2 = createClient();

    await Promise.all([
      waitForEvent(client1, "connect"),
      waitForEvent(client2, "connect"),
    ]);

    const roster1 = waitForEvent(client1, "room-roster-updated");
    client1.emit("joinRoom", { pin: PIN, username: "Professor", role: "host" });
    const firstRoster = await roster1;

    expect(firstRoster).toHaveLength(1);
    expect(firstRoster[0]).toMatchObject({ username: "Professor", role: "host" });

    const roster2 = waitForEvent(client2, "room-roster-updated");
    const roster1Again = waitForEvent(client1, "room-roster-updated");
    client2.emit("joinRoom", { pin: PIN, username: "Student", role: "player" });

    const [secondRoster, thirdRoster] = await Promise.all([roster2, roster1Again]);

    expect(secondRoster).toHaveLength(2);
    expect(thirdRoster).toHaveLength(2);

    client1.close();
    client2.close();
  });
});
