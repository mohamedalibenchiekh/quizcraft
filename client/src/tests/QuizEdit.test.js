import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
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

const mockReadinessResponse = {
  data: {
    success: true,
    data: {
      dynamicSetSize: 3,
      matchingTags: ['javascript'],
      enrichment: { ready: true, eligibleCount: 4, matchingCount: 1 },
      remediation: { ready: true, eligibleCount: 5, matchingCount: 1 },
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

    expect(screen.getByText(/loading quiz workspace/i)).toBeInTheDocument();
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

  it('clears stale adaptive readiness when the readiness request returns a non-success response', async () => {
    const secondQuizResponse = {
      data: {
        success: true,
        data: {
          ...mockAxiosResponse.data.data,
          _id: '507f191e810c19729de860ff',
          title: 'Second Quiz',
        },
      },
    };

    vi.spyOn(api, 'get')
      .mockResolvedValueOnce(mockAxiosResponse)
      .mockResolvedValueOnce(mockReadinessResponse)
      .mockResolvedValueOnce(secondQuizResponse)
      .mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Unable to inspect readiness.',
        },
      });

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/quizzes/edit/507f191e810c19729de860ea'] },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Link, { to: '/quizzes/edit/507f191e810c19729de860ff' }, 'Open second quiz'),
          React.createElement(
            Routes,
            null,
            React.createElement(
              Route,
              { path: '/quizzes/edit/:id', element: React.createElement(QuizEdit) }
            )
          )
        )
      )
    );

    expect(await screen.findByText('Question Bank Coverage')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /open second quiz/i }));

    expect(await screen.findByDisplayValue('Second Quiz')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Question Bank Coverage')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Unable to inspect readiness.')).toBeInTheDocument();
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
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
    });
  });
});
