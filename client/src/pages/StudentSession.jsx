import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket, socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const StudentSession = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Room code can arrive via React Router state (from Home page quick-join)
  const [roomCode] = useState(() => location.state?.roomCode || null);

  useEffect(() => {
    // Guard: if there's no auth token AND no room code, the user has no valid
    // way to be on this page — redirect them back to home.
    if (!token && !roomCode) {
      navigate('/', { replace: true });
      return;
    }

    // Connect the socket (with token if available, or anonymously for guest students)
    if (token) {
      connectSocket(token);
    } else {
      // Guest join: connect without auth and emit the room code to join the session
      connectSocket();
    }

    const handleConnect = () => {
      console.log('Connected to live session');

      // If we have a room code (guest join flow), emit a join-room event
      if (roomCode) {
        socket.emit('join-room', { roomCode });
        console.log(`Joining room: ${roomCode}`);
      }
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
      disconnectSocket();
    };
  }, [token, roomCode, navigate]);

  return (
    <div
      className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--color-surface-base)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="text-center mb-8">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4"
            style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}
          >
            <span className="w-2 h-2 mr-2 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
            Live Session
          </span>

          {roomCode && (
            <div className="mb-4">
              <span
                className="inline-block px-4 py-1.5 rounded-lg text-sm font-mono font-semibold tracking-widest"
                style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: 'var(--color-brand-300)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                Room {roomCode}
              </span>
            </div>
          )}

          <h2
            className="text-3xl font-extrabold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Waiting for Professor...
          </h2>
          <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            The quiz will start shortly. Please stand by.
          </p>
        </div>
        
        <div className="flex justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12"
            style={{ borderBottom: '2px solid #8b5cf6' }}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentSession;
