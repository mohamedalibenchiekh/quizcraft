import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentSession from '../pages/StudentSession.jsx';
import { socket } from '../services/socket';

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

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Test Student', email: 'student@test.com', role: 'student' },
    token: 'fake-jwt-token',
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('Short-Answer Input Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socket.connected = false;
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

    const pinInput = screen.getByPlaceholderText('ABC123');
    const nameInput = screen.getByPlaceholderText('Your name');
    const joinButton = screen.getByRole('button', { name: /join lobby/i });

    fireEvent.change(pinInput, { target: { value: 'XYZ789' } });
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(joinButton);
  };

  it('should render a textarea and submit button when a Short-Answer question is active, and remove the options grid', () => {
    joinLobbyHelper();

    const mockShortAnswerQuestion = {
      _id: 'q456',
      text: 'What is the capital of France?',
      type: 'Short-Answer',
    };

    act(() => {
      if (socket._callbacks['reveal-question']) {
        socket._callbacks['reveal-question'](mockShortAnswerQuestion);
      }
    });

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();

    expect(screen.getByTestId('short-answer-input')).toBeInTheDocument();
    expect(screen.getByTestId('short-answer-input').tagName).toBe('TEXTAREA');

    expect(screen.getByTestId('short-answer-submit')).toBeInTheDocument();

    expect(screen.queryByTestId('options-container')).not.toBeInTheDocument();
  });

  it('should keep the options grid for MCQ type questions', () => {
    joinLobbyHelper();

    const mockMCQQuestion = {
      _id: 'q789',
      text: 'Which is the largest planet?',
      type: 'MCQ',
      options: ['Earth', 'Jupiter', 'Mars', 'Venus'],
    };

    act(() => {
      if (socket._callbacks['reveal-question']) {
        socket._callbacks['reveal-question'](mockMCQQuestion);
      }
    });

    expect(screen.getByTestId('options-container')).toBeInTheDocument();
    expect(screen.queryByTestId('short-answer-input')).not.toBeInTheDocument();
  });

  it('should freeze short-answer input and submit button upon submission', () => {
    joinLobbyHelper();

    const mockShortAnswerQuestion = {
      _id: 'q456',
      text: 'What is the capital of France?',
      type: 'Short-Answer',
    };

    act(() => {
      if (socket._callbacks['reveal-question']) {
        socket._callbacks['reveal-question'](mockShortAnswerQuestion);
      }
    });

    const textarea = screen.getByTestId('short-answer-input');
    fireEvent.change(textarea, { target: { value: 'Paris' } });

    const submitBtn = screen.getByTestId('short-answer-submit');
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    expect(textarea).toBeDisabled();
    expect(submitBtn).toBeDisabled();
  });

  it('should show "Your answer" in results phase after submitting a short-answer', () => {
    joinLobbyHelper();

    const mockShortAnswerQuestion = {
      _id: 'q456',
      text: 'What is the capital of France?',
      type: 'Short-Answer',
    };

    act(() => {
      if (socket._callbacks['reveal-question']) {
        socket._callbacks['reveal-question'](mockShortAnswerQuestion);
      }
    });

    const textarea = screen.getByTestId('short-answer-input');
    fireEvent.change(textarea, { target: { value: 'Paris' } });
    fireEvent.click(screen.getByTestId('short-answer-submit'));

    act(() => {
      if (socket._callbacks['reveal-question-results']) {
        socket._callbacks['reveal-question-results']({
          correctAnswer: 'Paris',
          scoreboard: [],
        });
      }
    });

    expect(screen.getByText(/your answer:/i)).toBeInTheDocument();
    expect(screen.getByText(/correct answer was:/i)).toBeInTheDocument();
    expect(screen.getAllByText('Paris')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: /correct/i })).toBeInTheDocument();
  });
});
