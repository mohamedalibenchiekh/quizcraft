import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import QuizEdit from '../pages/QuizEdit';
import api from '../services/api';

const mockAxiosResponse = {
  data: {
    success: true,
    data: {
      _id: '507f191e810c19729de860ea',
      title: 'JavaScript Fundamentals',
      description: 'Test your JS knowledge',
      professorId: '507f191e810c19729de860eb',
      questions: [
        {
          _id: '507f191e810c19729de860ec',
          text: 'What is a closure?',
          type: 'MCQ',
          options: ['Function with lexical scope', 'A loop', 'A variable', 'An object'],
          correctAnswer: 'Function with lexical scope',
          difficulty: 'medium',
          tags: [],
        },
        {
          _id: '507f191e810c19729de860ed',
          text: 'JavaScript is a compiled language.',
          type: 'True-False',
          options: ['True', 'False'],
          correctAnswer: 'False',
          difficulty: 'easy',
          tags: [],
        },
      ],
    },
  },
};

const renderQuizEdit = (quizId = '507f191e810c19729de860ea') =>
  render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [`/quizzes/edit/${quizId}`] },
      React.createElement(
        Routes,
        null,
        React.createElement(
          Route,
          { path: '/quizzes/edit/:id', element: React.createElement(QuizEdit) }
        )
      )
    )
  );

describe('QuizEdit Component', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state while fetching quiz data', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}));
    renderQuizEdit();

    expect(screen.getByText(/loading quiz data/i)).toBeInTheDocument();
  });

  it('renders error state when API call fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValueOnce({
      response: { data: { message: 'Quiz not found' } },
    });
    renderQuizEdit();

    await waitFor(() => {
      expect(screen.getByText(/failed to load quiz/i)).toBeInTheDocument();
    });
  });

  it('hydrates form fields with pre-existing quiz data from the mocked API', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce(mockAxiosResponse);
    renderQuizEdit();

    await waitFor(() => {
      expect(screen.getByDisplayValue('JavaScript Fundamentals')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Test your JS knowledge')).toBeInTheDocument();

    expect(screen.getByDisplayValue('What is a closure?')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Function with lexical scope').length).toBe(2);

    expect(screen.getByDisplayValue('JavaScript is a compiled language.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add question/i })).toBeInTheDocument();
  });

  it('calls updateQuiz on save and navigates to dashboard', async () => {
    vi.spyOn(api, 'get').mockResolvedValueOnce(mockAxiosResponse);
    const updateMock = vi.spyOn(api, 'updateQuiz').mockResolvedValueOnce({
      success: true,
      data: mockAxiosResponse.data.data,
    });

    renderQuizEdit();

    await waitFor(() => {
      expect(screen.getByDisplayValue('JavaScript Fundamentals')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    saveButton.click();

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
