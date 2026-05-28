import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../pages/Home.jsx";

describe("Home Screen Tests", () => {
  it("should render modern Tech-Hero text, Professor Portal button, and Join Live Session link reliably", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    // 1. Verify Tech-Hero headline renders (broken into parts in Home.jsx)
    expect(screen.getByText(/Transform Course/i)).toBeInTheDocument();
    expect(screen.getByText(/Materials into/i)).toBeInTheDocument();
    expect(screen.getByText(/Interactive Quizzes/i)).toBeInTheDocument();

    // 2. Verify "Professor Portal" button renders reliably
    const profPortalBtn = screen.getByRole("button", { name: /professor portal/i });
    expect(profPortalBtn).toBeInTheDocument();
    expect(profPortalBtn.id).toBe("hero-professor-portal");

    // 3. Verify "Join Live Session" button renders reliably
    const joinLiveSessionBtn = screen.getByRole("button", { name: /join live session/i });
    expect(joinLiveSessionBtn).toBeInTheDocument();
    expect(joinLiveSessionBtn.id).toBe("hero-join-session");
  });

  it("should update local state cleanly and enable Join button when typing exactly 6 alphanumeric characters", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("ABC123");
    const joinButton = screen.getByRole("button", { name: /^join$/i });

    // 1. Initial State: Input is empty, Join button is disabled
    expect(input.value).toBe("");
    expect(joinButton).toBeDisabled();

    // 2. Typing special characters should be stripped, but alphanumeric kept and uppercased
    fireEvent.change(input, { target: { value: "a@b#c!" } });
    expect(input.value).toBe("ABC");
    expect(joinButton).toBeDisabled();

    // 3. Typing 3 alphanumeric chars (should be uppercased)
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input.value).toBe("ABC");
    expect(joinButton).toBeDisabled();

    // 4. Typing 6 alphanumeric chars
    fireEvent.change(input, { target: { value: "abc123" } });
    expect(input.value).toBe("ABC123");
    expect(joinButton).not.toBeDisabled();

    // 5. Attempting to type more than 6 characters (should trim at 6)
    fireEvent.change(input, { target: { value: "abc1234" } });
    expect(input.value).toBe("ABC123");
    expect(joinButton).not.toBeDisabled();
  });
});
