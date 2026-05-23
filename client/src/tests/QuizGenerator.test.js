import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import QuizGenerator from '../pages/QuizGenerator.jsx';
import api from '../services/api';

const renderGenerator = () => render(
  React.createElement(
    MemoryRouter,
    null,
    React.createElement(QuizGenerator)
  )
);

const mockQuestions = [
  {
    text: 'What does supervised learning require?',
    type: 'MCQ',
    options: ['Labeled data', 'No data', 'Only images', 'Random labels'],
    correctAnswer: 'Labeled data',
    difficulty: 'medium',
    tags: ['machine learning'],
  },
  {
    text: 'Neural networks are inspired by biological systems.',
    type: 'True-False',
    options: ['True', 'False'],
    correctAnswer: 'True',
    difficulty: 'medium',
    tags: [],
  },
];

describe('QuizGenerator AI workflow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an inline validation error when generating without a file', () => {
    renderGenerator();

    fireEvent.click(screen.getByRole('button', { name: /generate ai quiz/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/attach at least one pdf or docx/i);
  });

  it('shows and hides the asynchronous loading state around generation', async () => {
    vi.spyOn(api, 'generateQuizFromFiles').mockResolvedValueOnce({ questions: mockQuestions });
    renderGenerator();

    const file = new File(['course content'], 'lesson.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/upload documents/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /generate ai quiz/i }));

    expect(screen.getByTestId('ai-loading-spinner')).toBeInTheDocument();
    expect(screen.getByText(/ai is reading documents/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId('ai-loading-spinner')).not.toBeInTheDocument();
    });
  });

  it('renders generated question text and multiple-choice options in the preview', async () => {
    vi.spyOn(api, 'generateQuizFromFiles').mockResolvedValueOnce({ questions: mockQuestions });
    renderGenerator();

    const file = new File(['course content'], 'lesson.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(screen.getByLabelText(/upload documents/i), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /generate ai quiz/i }));

    expect(await screen.findByText(/generated quiz preview/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('What does supervised learning require?')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('Labeled data').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('No data')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Only images')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Random labels')).toBeInTheDocument();

    const secondQuestion = screen
      .getByDisplayValue('Neural networks are inspired by biological systems.')
      .closest('article');
    expect(within(secondQuestion).getByRole('button', { name: 'True' })).toBeInTheDocument();
    expect(within(secondQuestion).getByRole('button', { name: 'False' })).toBeInTheDocument();
  });

  it('supports the manual builder path without requiring AI upload', () => {
    renderGenerator();

    fireEvent.click(screen.getByRole('button', { name: /manual builder/i }));
    fireEvent.click(screen.getByRole('button', { name: /add question/i }));

    expect(screen.getByText(/manual quiz draft/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quiz title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/question 1 type/i)).toHaveValue('MCQ');
    expect(screen.getByLabelText(/question 1 option 1/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to my quizzes/i })).toBeInTheDocument();
  });
});
