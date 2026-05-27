import { Server } from "socket.io";
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

    socket.on("joinRoom", ({ pin, username, role } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("join-error", { message: "Invalid session PIN. Must be a 6-character alphanumeric code." });
        return;
      }

      const pinStr = String(pin);
      const room = getRoom(pinStr);

      if (role === "host") {
        room.hostId = socket.id;
      }

      room.participants.set(socket.id, {
        username: username || "Anonymous",
        role: role || "player",
      });

      socket.join(pinStr);
      console.log(`[Socket] ${socket.id} (${role}) joined room ${pinStr}`);

      broadcastRoster(io, pinStr);
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

    socket.on("submitAnswer", async ({ pin, questionId, chosenOption, username } = {}) => {
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
        const participant = room.participants.get(socket.id);
        const uname = username || (participant ? participant.username : "Anonymous");

        const currentScore = room.scores.get(uname) || 0;
        room.scores.set(uname, currentScore + delta);

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
