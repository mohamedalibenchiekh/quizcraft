import { io } from 'socket.io-client';

/* =============================================
   Socket.io Client Service — QuizCraft
   Provides a singleton socket instance and
   explicit event wrapper methods matching the
   backend event matrix (server/config/socket.js).
   ============================================= */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const apiUrl = API_BASE_URL.replace(/\/+$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api$/, '');

/**
 * Singleton socket instance.
 * autoConnect: false prevents open connection leaks before
 * a user explicitly enters a game loop.
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

/* ---------------------------------------------
   Connection Lifecycle
   --------------------------------------------- */

/**
 * Open the socket connection.
 * Optionally attach a JWT bearer token for authenticated flows.
 */
export const connectSocket = (token) => {
  socket.auth = token ? { token } : {};
  if (!socket.connected) {
    socket.connect();
  }
};

/**
 * Cleanly tear down the socket connection.
 */
export const disconnectSocket = () => {
  socket.disconnect();
};

/* ---------------------------------------------
   Event Wrapper Methods
   Each method maps 1-to-1 with a backend handler
   defined in server/config/socket.js.
   --------------------------------------------- */

/**
 * Student joins a live room.
 * @param {string} pin   — 6-character alphanumeric room PIN
 * @param {string} username — display name for the participant
 */
export const joinRoom = (pin, username) => {
  socket.emit('joinRoom', { pin, username });
};

/**
 * Professor claims host privileges for a room.
 * @param {string} pin   — room PIN
 * @param {string} token — JWT bearer token proving professor identity
 */
export const hostClaim = (pin, token) => {
  socket.emit('hostClaim', { pin, token });
};

/**
 * Professor signals quiz start.
 * @param {string} pin — room PIN
 */
export const startQuiz = (pin) => {
  socket.emit('startQuiz', { pin });
};

/**
 * Professor advances to the next question.
 * @param {string} pin            — room PIN
 * @param {number} questionIndex  — zero-based index of the target question
 */
export const nextQuestion = (pin, questionIndex) => {
  socket.emit('nextQuestion', { pin, questionIndex });
};

/**
 * Student submits an answer to the current question.
 * @param {string} pin          — room PIN
 * @param {string} questionId   — MongoDB ObjectId of the question document
 * @param {string} chosenOption — the selected option text
 */
export const submitAnswer = (pin, questionId, chosenOption) => {
  socket.emit('submitAnswer', { pin, questionId, chosenOption });
};

/**
 * Professor closes the room, ending the session.
 * @param {string} pin — room PIN
 */
export const closeRoom = (pin) => {
  socket.emit('roomClosed', { pin });
};

/**
 * Professor cancels a session before starting, tearing down the lobby.
 * @param {string} pin — room PIN
 */
export const cancelSession = (pin) => {
  socket.emit('cancelSession', { pin });
};

/* ---------------------------------------------
   Diagnostic Event Listeners
   --------------------------------------------- */

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
});

socket.on('reconnect_attempt', () => {
  console.warn('Socket attempting reconnection...');
});
