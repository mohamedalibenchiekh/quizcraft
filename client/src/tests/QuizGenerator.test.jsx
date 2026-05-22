import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuizGenerator from "../pages/QuizGenerator.jsx";

describe("Quiz Generator Panel Tests", () => {
  it("should dynamically append a question card form inside the DOM when clicking 'Add Question'", () => {
    render(
      <MemoryRouter>
        <QuizGenerator />
      </MemoryRouter>
    );

    // Initial state: No questions added message
    expect(screen.getByText(/No questions added yet/i)).toBeInTheDocument();

    // Click "Add Question" button
    const addBtn = screen.getByRole("button", { name: /add question/i });
    fireEvent.click(addBtn);

    // Assert that the question card renders
    expect(screen.queryByText(/No questions added yet/i)).not.toBeInTheDocument();
    expect(screen.getByText("Question Details")).toBeInTheDocument();
    expect(screen.getByLabelText(/Question Text/i)).toBeInTheDocument();
  });

  it("should display MCQ choices when type is MCQ, and expose single keyword correct answer field when switched to Short-Answer", () => {
    render(
      <MemoryRouter>
        <QuizGenerator />
      </MemoryRouter>
    );

    const addBtn = screen.getByRole("button", { name: /add question/i });
    fireEvent.click(addBtn);

    // Default question is 'MCQ'
    expect(screen.getByText(/Configure Choices & Set Correct Answer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Choice #1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Choice #2")).toBeInTheDocument();
    expect(screen.queryByText(/Precise Correct Answer Match String/i)).not.toBeInTheDocument();

    // Switch question type to 'Short-Answer'
    const shortAnswerBtn = screen.getByRole("button", { name: "Short-Answer" });
    fireEvent.click(shortAnswerBtn);

    // Assert MCQ option components are hidden, and Short-Answer exact keyword match is visible
    expect(screen.queryByText(/Configure Choices & Set Correct Answer/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Choice #1")).not.toBeInTheDocument();
    expect(screen.getByText(/Precise Correct Answer Match String/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. useState")).toBeInTheDocument();

    // Switch question type back to 'MCQ'
    const mcqBtn = screen.getByRole("button", { name: "MCQ" });
    fireEvent.click(mcqBtn);

    // MCQ option components should be back in the DOM
    expect(screen.getByText(/Configure Choices & Set Correct Answer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Choice #1")).toBeInTheDocument();
    expect(screen.queryByText(/Precise Correct Answer Match String/i)).not.toBeInTheDocument();
  });
});
