import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

const ROOM_PIN_REGEX = /^[A-Z0-9]{6}$/;

const rooms = new Map();

const getRoom = (pin) => {
  if (!rooms.has(pin)) {
    rooms.set(pin, { hostId: null, participants: new Map(), scores: new Map() });
  }
  return rooms.get(pin);
};

const broadcastRoster = (io, pin) => {
  const room = getRoom(pin);
  const roster = Array.from(room.participants.entries()).map(([socketId, p]) => ({
    socketId,
    username: p.username,
    role: p.role,
  }));
  io.to(pin).emit("room-roster-updated", roster);
};

const handleJoinRoom = (io, socket, { pin: rawPin, username, roomCode } = {}) => {
  const pin = rawPin || roomCode;
  if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
    socket.emit("join-error", { message: "Invalid session PIN. Must be a 6-character alphanumeric code." });
    return;
  }

  const pinStr = String(pin);
  const room = getRoom(pinStr);

  room.participants.set(socket.id, {
    username: username || "Anonymous",
    role: "player",
  });

  socket.join(pinStr);
  console.log(`[Socket] ${socket.id} joined room ${pinStr}`);

  broadcastRoster(io, pinStr);
};

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

    socket.on("joinRoom", (payload) => handleJoinRoom(io, socket, payload));
    socket.on("join-room", (payload) => handleJoinRoom(io, socket, payload));

    socket.on("hostClaim", async ({ pin, token } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin)) || !token) {
        socket.emit("control-error", { message: "Invalid payload or missing token." });
        return;
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const session = await Session.findOne({ pin: String(pin) });
        if (!session) {
          socket.emit("control-error", { message: "Session not found." });
          return;
        }

        if (decoded.id !== session.hostId.toString()) {
          socket.emit("control-error", { message: "You are not authorized as host for this session." });
          return;
        }

        const pinStr = String(pin);
        const room = getRoom(pinStr);
        room.hostId = socket.id;

        room.participants.set(socket.id, {
          username: decoded.id || "Host",
          role: "host",
        });

        socket.join(pinStr);
        broadcastRoster(io, pinStr);
        socket.emit("host-claimed", { message: "You are now the host." });
        console.log(`[Socket] ${socket.id} claimed host for room ${pinStr}`);
      } catch (error) {
        socket.emit("control-error", { message: "Invalid or expired token." });
      }
    });

    socket.on("startQuiz", async ({ pin } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);
      const room = getRoom(pinStr);

      if (room.hostId !== socket.id) {
        socket.emit("control-error", { message: "Only the host can start the quiz." });
        return;
      }

      try {
        await Session.findOneAndUpdate({ pin: pinStr }, { status: "active" });
        io.to(pinStr).emit("quiz-started");
        console.log(`[Socket] Quiz started by host ${socket.id} in room ${pinStr}`);
      } catch (error) {
        console.error(`[Socket] Error starting quiz: ${error.message}`);
        socket.emit("control-error", { message: "Internal error starting quiz." });
      }
    });

    socket.on("nextQuestion", async ({ pin, questionIndex } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);
      const room = getRoom(pinStr);

      if (room.hostId !== socket.id) {
        socket.emit("control-error", { message: "Only the host can advance questions." });
        return;
      }

      try {
        const session = await Session.findOne({ pin: pinStr });
        if (!session) {
          socket.emit("control-error", { message: "Session not found." });
          return;
        }

        const quiz = await Quiz.findById(session.quizId).populate("questions");
        if (!quiz || !quiz.questions || questionIndex >= quiz.questions.length) {
          socket.emit("control-error", { message: "Invalid question index." });
          return;
        }

        const questionDoc = quiz.questions[questionIndex];
        const filteredQuestion = questionDoc.toObject();
        delete filteredQuestion.correctAnswer;

        io.to(pinStr).emit("reveal-question", filteredQuestion);
      } catch (error) {
        console.error(`[Socket] Error in nextQuestion: ${error.message}`);
        socket.emit("control-error", { message: "Internal error fetching question." });
      }
    });

    socket.on("submitAnswer", async ({ pin, questionId, chosenOption } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("submit-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);
      const room = getRoom(pinStr);

      try {
        const session = await Session.findOne({ pin: pinStr });
        if (!session || session.status !== "active") {
          socket.emit("submit-error", { message: "Session is not currently active." });
          return;
        }

        const question = await Question.findById(questionId);
        if (!question) {
          socket.emit("submit-error", { message: "Question not found." });
          return;
        }

        const isCorrect = question.correctAnswer === chosenOption;
        const delta = isCorrect ? 1 : 0;

        const currentScore = room.scores.get(socket.id) || 0;
        room.scores.set(socket.id, currentScore + delta);

        socket.emit("answer-acknowledged", {
          questionId,
          correct: isCorrect,
          score: currentScore + delta,
        });
      } catch (error) {
        console.error(`[Socket] Error in submitAnswer: ${error.message}`);
        socket.emit("submit-error", { message: "Internal error processing answer." });
      }
    });

    socket.on("roomClosed", async ({ pin } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);
      const room = getRoom(pinStr);

      if (room.hostId !== socket.id) {
        socket.emit("control-error", { message: "Only the host can close the room." });
        return;
      }

      try {
        await Session.findOneAndUpdate({ pin: pinStr }, { status: "completed" });
      } catch (error) {
        console.error(`[Socket] Error updating session: ${error.message}`);
      }

      io.to(pinStr).emit("quiz-terminated", { message: "Quiz has been terminated by the host." });

      io.in(pinStr).socketsLeave(pinStr);
      rooms.delete(pinStr);
      console.log(`[Socket] Room ${pinStr} closed by host ${socket.id}`);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);

      for (const [pin, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id);
          room.scores.delete(socket.id);
          if (room.hostId === socket.id) {
            room.hostId = null;
          }
          broadcastRoster(io, pin);
          if (room.participants.size === 0) {
            rooms.delete(pin);
          }
          break;
        }
      }
    });
  });

  return io;
};
