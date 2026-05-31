import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentSession from '../pages/StudentSession.jsx';
import { socket } from '../services/socket';
import api from '../services/api';

// 1. Mock the socket singleton service
vi.mock('../services/socket', () => {
  const callbacks = {};
  const mockSocket = {
    connected: false,
    on: vi.fn((event, cb) => {
      callbacks[event] = cb;
    }),
    off: vi.fn((event) => {
      delete callbacks[event];
    }),
    once: vi.fn((event, cb) => {
      const wrappedCb = (...args) => {
        delete callbacks[event];
        cb(...args);
      };
      callbacks[event] = wrappedCb;
    }),
    emit: vi.fn(),
    connect: vi.fn(() => {
      mockSocket.connected = true;
      if (callbacks['connect']) {
        callbacks['connect']();
      }
    }),
    disconnect: vi.fn(() => {
      mockSocket.connected = false;
    }),
    _callbacks: callbacks,
  };

  return {
    socket: mockSocket,
    connectSocket: vi.fn(() => {
      mockSocket.connect();
    }),
    disconnectSocket: vi.fn(() => {
      mockSocket.disconnect();
    }),
    joinRoom: vi.fn((pin, username) => {
      mockSocket.emit('joinRoom', { pin, username });
    }),
    submitAnswer: vi.fn((pin, questionId, chosenOption) => {
      mockSocket.emit('submitAnswer', { pin, questionId, chosenOption });
    }),
  };
});

// 2. Mock useAuth hook from AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test Student', email: 'student@test.com', role: 'student' },
    token: 'fake-jwt-token',
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('LiveSession Student Portal Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socket.connected = false;
    api.post.mockResolvedValue({
      data: {
        success: true,
        status: 'standard',
        message: 'Quiz completed successfully.',
        data: {
          score: 1,
          totalQuestions: 1,
          scoreRatio: 1,
          correctCount: 1,
        },
      },
    });
    // Clear callbacks dictionary
    Object.keys(socket._callbacks).forEach((key) => {
      delete socket._callbacks[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const joinLobbyHelper = () => {
    render(
      <MemoryRouter>
        <StudentSession />
      </MemoryRouter>
    );

    // Enter PIN and username
    const pinInput = screen.getByPlaceholderText('ABC123');
    const nameInput = screen.getByPlaceholderText('Your name');
    const joinButton = screen.getByRole('button', { name: /join lobby/i });

    fireEvent.change(pinInput, { target: { value: 'XYZ789' } });
    fireEvent.change(nameInput, { target: { value: 'Alice' } });

    // Click join
    fireEvent.click(joinButton);
  };

  it('Test Case 2 — Roster Streaming Loop: should dynamically render participant list when room-roster-updated is emitted', () => {
    joinLobbyHelper();

    // Verify in lobby state
    expect(screen.getByText(/Waiting for Host…/i)).toBeInTheDocument();

    // Simulate server roster update
    const mockRoster = [
      { socketId: '1', username: 'Alice', role: 'student' },
      { socketId: '2', username: 'Bob', role: 'student' },
      { socketId: '3', username: 'Charlie', role: 'student' },
    ];

    act(() => {
      if (socket._callbacks['room-roster-updated']) {
        socket._callbacks['room-roster-updated'](mockRoster);
      }
    });

    // Roster count is updated in the subtitle: "3 players in the lobby."
    expect(screen.getByText(/3 players in the lobby/i)).toBeInTheDocument();
  });

  it('Test Case 1 — Input Freeze Realization: should freeze all options as soon as an option is selected and show waiting overlay', () => {
    joinLobbyHelper();

    // Simulate quiz starting and question being revealed
    const mockQuestion = {
      _id: 'q123',
      text: 'Which course material is the source of truth?',
      type: 'MCQ',
      options: ['Syllabus', 'Slides', 'AI Generator', 'Wikipedia'],
    };

    act(() => {
      if (socket._callbacks['reveal-question']) {
        socket._callbacks['reveal-question'](mockQuestion);
      }
    });

    // Check we entered the active question phase
    expect(screen.getByText('Which course material is the source of truth?')).toBeInTheDocument();

    // Verify options are displayed and enabled initially
    const opt0 = screen.getByTestId('option-btn-0');
    const opt1 = screen.getByTestId('option-btn-1');
    const opt2 = screen.getByTestId('option-btn-2');
    const opt3 = screen.getByTestId('option-btn-3');

    expect(opt0).not.toBeDisabled();
    expect(opt1).not.toBeDisabled();
    expect(opt2).not.toBeDisabled();
    expect(opt3).not.toBeDisabled();

    // Click Option A (opt0)
    fireEvent.click(opt0);

    // Verify all option buttons are disabled immediately (QC-BR-03 Input Freeze)
    expect(opt0).toBeDisabled();
    expect(opt1).toBeDisabled();
    expect(opt2).toBeDisabled();
    expect(opt3).toBeDisabled();

    // Verify the waiting overlay appears
    expect(screen.getByText(/Answer locked in! Waiting for other participants/i)).toBeInTheDocument();
  });

  it('should show the adaptive enrichment challenge after a live session ends and submit the variant ID', async () => {
    joinLobbyHelper();

    act(() => {
      socket._callbacks['adaptive-session-result']({
        success: true,
        status: 'enrichment',
        message: 'Advanced variant block triggered!',
        adaptiveVariantId: 'variant-live-1',
        adaptiveVariant: {
          _id: 'variant-live-1',
          baselineQuizId: 'quiz-live-1',
          type: 'enrichment',
          attemptDepth: 1,
        },
        adaptiveQuestions: [
          {
            _id: 'vq-live-1',
            text: 'Advanced live-session question?',
            type: 'MCQ',
            options: ['Correct', 'Wrong'],
            difficulty: 'hard',
          },
        ],
        data: {
          score: 1,
          totalQuestions: 1,
          scoreRatio: 1,
          correctCount: 1,
          adaptiveTriggered: true,
          adaptiveType: 'enrichment',
        },
      });
      socket._callbacks['quiz-terminated']({ message: 'Quiz has been terminated by the host.' });
    });

    expect(screen.getByText('Advanced Challenge Unlocked')).toBeInTheDocument();
    expect(screen.getByText('Advanced live-session question?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Correct'));
    fireEvent.click(screen.getByRole('button', { name: /submit advanced challenge/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/attempts/submit', {
        quizId: 'variant-live-1',
        answers: [{ questionId: 'vq-live-1', selectedAnswer: 'Correct' }],
      });
    });
  });

  it('should show an adaptive unavailable message when live-session variant generation fails', () => {
    joinLobbyHelper();

    act(() => {
      socket._callbacks['adaptive-session-result']({
        success: false,
        status: 'enrichment',
        message: 'Advanced challenge could not be prepared. Your quiz attempt was saved.',
        data: {
          score: 1,
          totalQuestions: 1,
          scoreRatio: 1,
          correctCount: 1,
          adaptiveTriggered: false,
          adaptiveType: 'enrichment',
        },
      });
      socket._callbacks['quiz-terminated']({ message: 'Quiz has been terminated by the host.' });
    });

    expect(screen.getByText('Advanced Challenge Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Advanced challenge could not be prepared. Your quiz attempt was saved.')).toBeInTheDocument();
  });
});
