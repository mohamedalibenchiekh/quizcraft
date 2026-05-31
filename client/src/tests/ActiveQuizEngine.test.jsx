import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActiveQuizEngine from '../components/ActiveQuizEngine.jsx';

const baseProps = {
  answers: {},
  submitting: false,
  allAnswered: false,
  onSelectOption: vi.fn(),
  onShortAnswerChange: vi.fn(),
  onSubmit: vi.fn(),
};

describe('ActiveQuizEngine defensive rendering', () => {
  it('should render without crashing when quiz.questions is missing', () => {
    render(<ActiveQuizEngine {...baseProps} quiz={{ title: 'Incomplete Quiz' }} />);

    expect(screen.getByText('Incomplete Quiz')).toBeInTheDocument();
    expect(screen.getByText('0 questions')).toBeInTheDocument();
  });

  it('should render malformed MCQ questions without crashing when options are missing', () => {
    render(
      <ActiveQuizEngine
        {...baseProps}
        quiz={{
          title: 'Malformed Quiz',
          questions: [
            {
              _id: 'q1',
              text: 'Question with missing options',
              type: 'MCQ',
              difficulty: 'medium',
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Question with missing options')).toBeInTheDocument();
    expect(screen.getByText('No answer options available for this question.')).toBeInTheDocument();
  });
});
