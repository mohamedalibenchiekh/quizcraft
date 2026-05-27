import { Server } from "socket.io";

const ROOM_PIN_REGEX = /^\d{6}$/;

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || process.env.VITE_API_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on("join-session", ({ pin, username } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("join-error", { message: "Invalid session PIN. Must be a 6-digit code." });
        return;
      }

      const pinStr = String(pin);
      socket.join(pinStr);
      console.log(`[Socket] ${socket.id} joined room ${pinStr}`);

      io.to(pinStr).emit("user-joined", {
        socketId: socket.id,
        username: username || "Anonymous",
      });
    });

    socket.on("start-quiz", ({ pin } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);
      if (!socket.rooms.has(pinStr)) {
        socket.emit("control-error", { message: "You are not a member of this session room." });
        return;
      }

      socket.to(pinStr).emit("quiz-started");
      console.log(`[Socket] Quiz started by ${socket.id} in room ${pin}`);
    });

    socket.on("next-question", ({ pin, questionIndex } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);
      if (!socket.rooms.has(pinStr)) {
        socket.emit("control-error", { message: "You are not a member of this session room." });
        return;
      }

      socket.to(pinStr).emit("next-question", { questionIndex });
      console.log(`[Socket] Next question ${questionIndex} by ${socket.id} in room ${pin}`);
    });

    socket.on("submit-answer", ({ pin, questionIndex, choice } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("submit-error", { message: "Invalid session PIN." });
        return;
      }

      console.log(
        `[Socket] Answer from ${socket.id} in room ${pin}: Q${questionIndex} -> ${choice}`
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};
