import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import StudentDashboard from "../pages/StudentDashboard.jsx";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../services/api", () => {
  const mockGet = vi.fn();
  return {
    default: {
      get: mockGet,
    },
    __esModule: true,
  };
});

import api from "../services/api";

const renderWithAuth = () => {
  localStorage.setItem("token", "fake-jwt-token");
  return render(
    <MemoryRouter initialEntries={["/student/dashboard"]}>
      <AuthProvider>
        <StudentDashboard />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe("StudentDashboard Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    api.get.mockImplementation((url) => {
      if (url === "/attempts/my") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                _id: "attempt1",
                quizId: { title: "JavaScript Basics" },
                score: 8,
                totalQuestions: 10,
                scoreRatio: 0.8,
                createdAt: "2025-05-20T10:00:00Z",
              },
              {
                _id: "attempt2",
                quizId: { title: "React Fundamentals" },
                score: 9,
                totalQuestions: 10,
                scoreRatio: 0.9,
                createdAt: "2025-05-22T14:00:00Z",
              },
            ],
          },
        });
      }
      if (url === "/attempts/stats") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              totalQuizzes: 2,
              averageScoreRatio: 85,
              trophies: 1,
            },
          },
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });
  });

  it("should render the dashboard heading and description", async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText("Student Dashboard")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Join live sessions, review past performances/i)
    ).toBeInTheDocument();
  });

  it("should render the 6-character PIN submission input", async () => {
    renderWithAuth();

    const pinInput = await screen.findByPlaceholderText("ABC123");
    expect(pinInput).toBeInTheDocument();
    expect(pinInput).toHaveAttribute("maxLength", "6");
  });

  it("should render the 'Join Live Quiz Session' button disabled until 6 chars entered", async () => {
    renderWithAuth();

    const joinBtn = await screen.findByText("Join Live Quiz Session");
    expect(joinBtn).toBeDisabled();

    const pinInput = screen.getByPlaceholderText("ABC123");
    fireEvent.change(pinInput, { target: { value: "ABC123" } });

    expect(joinBtn).not.toBeDisabled();
  });

  it("should render metric cards with correct values from API", async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    expect(screen.getByText("Total Quizzes Completed")).toBeInTheDocument();
    expect(screen.getByText("Average Score Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Streaks & Adaptive Trophies")).toBeInTheDocument();
  });

  it("should render the historical review table with attempt data", async () => {
    renderWithAuth();

    expect(await screen.findByText("JavaScript Basics")).toBeInTheDocument();
    expect(screen.getByText("React Fundamentals")).toBeInTheDocument();

    const reviewButtons = screen.getAllByText("Review Performance");
    expect(reviewButtons).toHaveLength(2);
  });

  it("should render 'No attempts yet' empty state when no data", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/attempts/my") {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url === "/attempts/stats") {
        return Promise.resolve({
          data: { success: true, data: { totalQuizzes: 0, averageScoreRatio: 0, trophies: 0 } },
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByText("No attempts yet")).toBeInTheDocument();
    });
  });

  it("should navigate to /session with roomCode state on valid PIN submit", async () => {
    renderWithAuth();

    const pinInput = await screen.findByPlaceholderText("ABC123");
    fireEvent.change(pinInput, { target: { value: "XYZ789" } });

    const joinBtn = screen.getByText("Join Live Quiz Session");
    fireEvent.click(joinBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/session", {
      state: { roomCode: "XYZ789" },
    });
  });

  it("should filter PIN input to alphanumeric only and uppercase automatically", async () => {
    renderWithAuth();

    const pinInput = await screen.findByPlaceholderText("ABC123");
    fireEvent.change(pinInput, { target: { value: "a@b#c!" } });
    expect(pinInput.value).toBe("ABC");

    fireEvent.change(pinInput, { target: { value: "abc123" } });
    expect(pinInput.value).toBe("ABC123");
  });


});
