import { io } from 'socket.io-client';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Connect manually when needed (e.g. in student session)
});

export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
};

export const disconnectSocket = () => {
  socket.disconnect();
};

// Connection event listeners for diagnostics
socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
});

socket.on('reconnect_attempt', () => {
  console.warn('Socket attempting reconnection...');
});
