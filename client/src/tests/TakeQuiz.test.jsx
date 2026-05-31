import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TakeQuiz from '../pages/TakeQuiz.jsx';
import api from '../services/api';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'quiz-1' }),
  };
});

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const baselineQuiz = {
  _id: 'quiz-1',
  title: 'Baseline Quiz',
  description: 'Core check',
  questions: [
    {
      _id: 'q-1',
      text: 'Baseline question?',
      type: 'MCQ',
      options: ['Correct', 'Wrong'],
      difficulty: 'easy',
    },
  ],
};

const enrichmentResponse = {
  success: true,
  status: 'enrichment',
  message: 'Advanced variant block triggered!',
  adaptiveVariantId: 'variant-1',
  adaptiveVariant: {
    _id: 'variant-1',
    baselineQuizId: 'quiz-1',
    type: 'enrichment',
    attemptDepth: 1,
  },
  adaptiveQuestions: [
    {
      _id: 'vq-1',
      text: 'Advanced question?',
      type: 'MCQ',
      options: ['Deep Correct', 'Deep Wrong'],
      difficulty: 'hard',
      tags: ['advanced'],
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
};

describe('TakeQuiz adaptive flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: baselineQuiz } });
    api.post
      .mockResolvedValueOnce({ data: enrichmentResponse })
      .mockResolvedValueOnce({
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
  });

  it('renders adaptive enrichment through ActiveQuizEngine and submits the variant ID', async () => {
    render(
      <MemoryRouter>
        <TakeQuiz />
      </MemoryRouter>
    );

    expect(await screen.findByText('Baseline Quiz')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Correct'));
    fireEvent.click(screen.getByRole('button', { name: /submit assessment/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(1, '/attempts/submit', {
        quizId: 'quiz-1',
        answers: [{ questionId: 'q-1', selectedAnswer: 'Correct' }],
      });
    });

    expect(await screen.findByText('Advanced Challenge Unlocked')).toBeInTheDocument();
    expect(screen.getByTestId('active-quiz-engine')).toBeInTheDocument();
    expect(screen.getByText('Advanced question?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Deep Correct'));
    fireEvent.click(screen.getByRole('button', { name: /submit advanced challenge/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenNthCalledWith(2, '/attempts/submit', {
        quizId: 'variant-1',
        answers: [{ questionId: 'vq-1', selectedAnswer: 'Deep Correct' }],
      });
    });
  });
});
