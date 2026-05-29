import { Server } from "socket.io";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Session from "../models/Session.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import Attempt from "../models/Attempt.js";
import {
  startQuestion,
  recordAnswer,
  compileLeaderboard,
  finalizeUnansweredPlayers,
  hasAnsweredThisRound,
  allAnsweredThisRound,
  deleteScoreboard,
  getScoreboard,
} from "../utils/scoreboardManager.js";

const ROOM_PIN_REGEX = /^[A-Z0-9]{6}$/;
const NETWORK_BUFFER_MS = 500;
const DEFAULT_QUESTION_DURATION_MS = 30000;

const rooms = new Map();

const getRoom = (pin) => {
  if (!rooms.has(pin)) {
    rooms.set(pin, {
      hostId: null,
      participants: new Map(),
      questionExpiresAt: 0,
      questionStartTime: null,
      questionDuration: DEFAULT_QUESTION_DURATION_MS,
      currentCorrectAnswer: null,
      currentQuestionId: null,
      questionTimeoutId: null,
      resultsRevealed: false,
      quizId: null,        // set when quiz starts
      answerLog: new Map(), // playerId -> [{ questionId, selectedAnswer, isCorrect }]
      allPlayers: new Map(), // NEW: playerId -> { playerId, username, role, userId }
    });
  }
  return rooms.get(pin);
};

/**
 * Persist Attempt records for every authenticated player in a room.
 * Called when the host closes the quiz so that student dashboards
 * display historical results.
 */
const persistAttempts = async (pinStr) => {
  const room = rooms.get(pinStr);
  if (!room || !room.quizId) return;

  try {
    const quiz = await Quiz.findById(room.quizId).populate("questions");
    if (!quiz || !quiz.questions) return;

    const totalQuestions = quiz.questions.length;
    if (totalQuestions === 0) return;

    // Build a quick-lookup for correct answers
    const correctMap = {};
    for (const q of quiz.questions) {
      correctMap[q._id.toString()] = q.correctAnswer;
    }

    // Group all playerIds by userId to deduplicate reconnecting users
    const userToPlayerIds = new Map();
    for (const [playerId, participant] of room.allPlayers.entries()) {
      if (participant.role === "host" || !participant.userId) continue;
      
      const uId = participant.userId.toString();
      if (!userToPlayerIds.has(uId)) {
        userToPlayerIds.set(uId, []);
      }
      userToPlayerIds.get(uId).push(playerId);
    }

    for (const [uId, playerIds] of userToPlayerIds.entries()) {
      const allPlayerAnswers = [];
      for (const pId of playerIds) {
        const answers = room.answerLog.get(pId) || [];
        allPlayerAnswers.push(...answers);
      }

      // Build graded answers array — include unanswered questions
      const gradedAnswers = quiz.questions.map((q) => {
        const qId = q._id.toString();
        // Reverse array to find the most recent answer if they answered multiple times
        const logged = [...allPlayerAnswers].reverse().find((a) => a.questionId === qId);
        return {
          questionId: q._id,
          selectedAnswer: logged ? logged.selectedAnswer : null,
          isCorrect: logged ? logged.isCorrect : false,
        };
      });

      const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
      const scoreRatio = totalQuestions > 0 ? correctCount / totalQuestions : 0;

      let adaptiveTriggered = false;
      let adaptiveType = "none";
      if (scoreRatio < 0.5) {
        adaptiveTriggered = true;
        adaptiveType = "remediation";
      } else if (scoreRatio > 0.85) {
        adaptiveTriggered = true;
        adaptiveType = "enrichment";
      }

      await Attempt.create({
        userId: uId,
        quizId: room.quizId,
        answers: gradedAnswers,
        score: correctCount,
        totalQuestions,
        scoreRatio,
        adaptiveTriggered,
        adaptiveType,
      });

      console.log(
        `[Socket] Persisted Attempt for user ${uId} – score ${correctCount}/${totalQuestions}`
      );
    }
  } catch (err) {
    console.error(`[Socket] Failed to persist attempts for room ${pinStr}:`, err.message);
  }
};

const emitRevealQuestionResults = (io, pinStr) => {
  const room = getRoom(pinStr);
  const lb = compileLeaderboard(pinStr);
  const sb = getScoreboard(pinStr);

  io.to(pinStr).emit("reveal-question-results", {
    correctAnswer: room.currentCorrectAnswer,
    scoreboard: lb,
  });

  for (const [socketId, participant] of room.participants.entries()) {
    if (participant.role === "host") continue;
    const playerEntry = sb.players[participant.playerId];
    if (playerEntry && playerEntry.lastResult) {
      io.to(socketId).emit("your-question-result", playerEntry.lastResult);
    }
  }

  if (lb.length > 0) {
    io.to(pinStr).emit("leaderboard-updated", { leaderboard: lb });
  }
};

const broadcastRoster = (io, pin) => {
  const room = getRoom(pin);
  const roster = Array.from(room.participants.entries()).map(([socketId, p]) => ({
    socketId,
    playerId: p.playerId,
    username: p.username,
    role: p.role,
  }));
  io.to(pin).emit("room-roster-updated", roster);
};

const generatePlayerId = () => crypto.randomUUID();

const handleJoinRoom = (io, socket, { pin: rawPin, username, roomCode, token } = {}) => {
  const pin = rawPin || roomCode;
  if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
    socket.emit("join-error", { message: "Invalid session PIN. Must be a 6-character alphanumeric code." });
    return;
  }

  const pinStr = String(pin);

  if (!rooms.has(pinStr) || !rooms.get(pinStr).hostId) {
    socket.emit("session-error", { message: "This session is no longer active or the host has disconnected." });
    return;
  }

  const room = getRoom(pinStr);

  const nameExists = Array.from(room.participants.values()).some(
    (p) => p.username.toLowerCase().trim() === (username || "Anonymous").toLowerCase().trim()
  );
  if (nameExists) {
    socket.emit("join-rejected", {
      reason: "name_taken",
      message: "This username is already taken in this room.",
    });
    return;
  }

  // Try to extract userId from JWT so we can persist attempts later
  let userId = null;
  const authToken = token || socket.handshake?.auth?.token;
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
      userId = decoded.id || null;
    } catch (_) {
      // guest — no userId, attempts won't be saved
    }
  }

  const id = generatePlayerId();

  const participant = {
    playerId: id,
    username: username || "Anonymous",
    role: "player",
    userId, // null for guests, ObjectId string for authenticated students
  };

  room.participants.set(socket.id, participant);
  room.allPlayers.set(id, participant);

  socket.join(pinStr);
  console.log(`[Socket] ${socket.id} (player ${id}${userId ? ', user ' + userId : ', guest'}) joined room ${pinStr}`);

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

        const hostParticipant = {
          playerId: generatePlayerId(),
          username: decoded.id || "Host",
          role: "host",
        };

        room.participants.set(socket.id, hostParticipant);
        room.allPlayers.set(hostParticipant.playerId, hostParticipant);

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
        const updated = await Session.findOneAndUpdate({ pin: pinStr }, { status: "active" });
        if (!updated) {
          socket.emit("control-error", { message: "Session not found." });
          return;
        }
        // Store quizId on room so we can persist attempts later
        room.quizId = updated.quizId;
        io.to(pinStr).emit("quiz-started");
        console.log(`[Socket] Quiz started by host ${socket.id} in room ${pinStr}`);
      } catch (error) {
        console.error(`[Socket] Error starting quiz: ${error.message}`);
        socket.emit("control-error", { message: "Internal error starting quiz." });
      }
    });

    socket.on("nextQuestion", async ({ pin, questionIndex, durationMs } = {}) => {
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

        if (room.questionStartTime && !room.resultsRevealed) {
          room.resultsRevealed = true;
          if (room.questionTimeoutId) {
            clearTimeout(room.questionTimeoutId);
            room.questionTimeoutId = null;
          }
          finalizeUnansweredPlayers(pinStr);
          emitRevealQuestionResults(io, pinStr);
        }

        const questionDuration =
          typeof durationMs === "number" && Number.isFinite(durationMs) && durationMs > 0
            ? durationMs
            : DEFAULT_QUESTION_DURATION_MS;
        room.questionExpiresAt = Date.now() + questionDuration + NETWORK_BUFFER_MS;
        room.questionStartTime = Date.now();
        room.questionDuration = questionDuration;
        room.currentCorrectAnswer = questionDoc.correctAnswer;
        room.currentQuestionId = questionDoc._id;
        room.resultsRevealed = false;

        if (room.questionTimeoutId) {
          clearTimeout(room.questionTimeoutId);
        }
        room.questionTimeoutId = setTimeout(() => {
          const r = rooms.get(pinStr);
          if (!r) return;
          if (r.questionStartTime && !r.resultsRevealed) {
            r.resultsRevealed = true;
            finalizeUnansweredPlayers(pinStr);
            emitRevealQuestionResults(io, pinStr);
          }
          r.questionTimeoutId = null;
        }, questionDuration + NETWORK_BUFFER_MS);

        startQuestion(pinStr, room.questionStartTime);

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
      const receivedAt = Date.now();

      if (!room.questionStartTime) {
        socket.emit("submit-error", { message: "No question is currently active." });
        return;
      }

      const participant = room.participants.get(socket.id);
      const pid = participant ? participant.playerId : null;

      if (participant && participant.role === "host") {
        socket.emit("submit-error", { message: "Host cannot submit answers." });
        return;
      }

      if (pid && hasAnsweredThisRound(pinStr, pid)) {
        socket.emit("submit-error", { message: "You have already answered this question." });
        return;
      }

      if (room.questionExpiresAt > 0 && receivedAt > room.questionExpiresAt) {
        if (pid) {
          recordAnswer(pinStr, {
            playerId: pid,
            username: participant.username,
            isCorrect: false,
            responseTimeMs: 0,
            questionDurationMs: room.questionDuration,
          });
        }
        socket.emit("answer-rejected", { reason: "timeout", pointsAwarded: 0 });
        return;
      }

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

        if (!pid) {
          socket.emit("submit-error", { message: "Participant not found." });
          return;
        }

        const responseTimeMs = receivedAt - room.questionStartTime;
        recordAnswer(pinStr, {
          playerId: pid,
          username: participant.username,
          isCorrect,
          responseTimeMs,
          questionDurationMs: room.questionDuration,
        });

        // Track answer for historical persistence
        if (!room.answerLog.has(pid)) {
          room.answerLog.set(pid, []);
        }
        room.answerLog.get(pid).push({
          questionId: questionId.toString(),
          selectedAnswer: chosenOption,
          isCorrect,
        });

        socket.emit("answer-received", {
          questionId,
        });

        const nonHostCount = Array.from(room.participants.values()).filter((p) => p.role !== "host").length;
        if (allAnsweredThisRound(pinStr, nonHostCount) && !room.resultsRevealed) {
          room.resultsRevealed = true;
          if (room.questionTimeoutId) {
            clearTimeout(room.questionTimeoutId);
            room.questionTimeoutId = null;
          }
          emitRevealQuestionResults(io, pinStr);
        }
      } catch (error) {
        console.error(`[Socket] Error in submitAnswer: ${error.message}`);
        socket.emit("submit-error", { message: "Internal error processing answer." });
      }
    });

    socket.on("cancelSession", async ({ pin } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);

      if (!rooms.has(pinStr)) {
        socket.emit("control-error", { message: "No active session found for this PIN." });
        return;
      }

      const room = getRoom(pinStr);

      if (room.hostId !== socket.id) {
        socket.emit("control-error", { message: "Only the host can cancel the session." });
        return;
      }

      try {
        await Session.findOneAndUpdate({ pin: pinStr }, { status: "completed" });
      } catch (error) {
        console.error(`[Socket] Error updating session on cancel: ${error.message}`);
      }

      // Persist attempts even on cancel so students don't lose progress
      await persistAttempts(pinStr);

      io.to(pinStr).emit("room-terminated", { message: "The host has cancelled this session." });

      io.in(pinStr).socketsLeave(pinStr);
      rooms.delete(pinStr);
      deleteScoreboard(pinStr);
      console.log(`[Socket] Room ${pinStr} cancelled by host ${socket.id}`);
    });

    socket.on("roomClosed", async ({ pin } = {}) => {
      if (!pin || !ROOM_PIN_REGEX.test(String(pin))) {
        socket.emit("control-error", { message: "Invalid session PIN." });
        return;
      }

      const pinStr = String(pin);

      if (!rooms.has(pinStr)) {
        socket.emit("control-error", { message: "No active session found for this PIN." });
        return;
      }

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

      // Persist attempts for all authenticated students before cleanup
      await persistAttempts(pinStr);

      const finalLb = compileLeaderboard(pinStr);
      if (finalLb.length > 0) {
        io.to(pinStr).emit("leaderboard-updated", { leaderboard: finalLb });
      }
      io.to(pinStr).emit("quiz-terminated", { message: "Quiz has been terminated by the host." });

      io.in(pinStr).socketsLeave(pinStr);
      rooms.delete(pinStr);
      deleteScoreboard(pinStr);
      console.log(`[Socket] Room ${pinStr} closed by host ${socket.id}`);
    });

    socket.on("disconnect", async (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (${reason})`);

      for (const [pin, room] of rooms.entries()) {
        if (room.hostId === socket.id) {
          io.to(pin).emit("room-terminated", { message: "The host has disconnected. This session is no longer available." });
          io.in(pin).socketsLeave(pin);
          rooms.delete(pin);
          deleteScoreboard(pin);
          try {
            await Session.findOneAndUpdate({ pin }, { status: "completed" });
          } catch (error) {
            console.error(`[Socket] Error updating session on host disconnect: ${error.message}`);
          }
          break;
        }
        if (room.participants.has(socket.id)) {
          const wasHost = room.hostId === socket.id;
          room.participants.delete(socket.id);
          if (wasHost) {
            room.hostId = null;
            const finalLb = compileLeaderboard(pin);
            if (finalLb.length > 0) {
              io.to(pin).emit("leaderboard-updated", { leaderboard: finalLb });
            }
            io.to(pin).emit("room-terminated", { message: "Host has disconnected. The session has ended." });
            io.in(pin).socketsLeave(pin);
            rooms.delete(pin);
            deleteScoreboard(pin);
            try {
              await Session.findOneAndUpdate({ pin }, { status: "completed" });
            } catch (error) {
              console.error(`[Socket] Failed to mark session ${pin} as completed: ${error.message}`);
            }
          } else {
            broadcastRoster(io, pin);
            if (room.participants.size === 0) {
              rooms.delete(pin);
              deleteScoreboard(pin);
            }
          }
          break;
        }
      }
    });
  });

  return io;
};
