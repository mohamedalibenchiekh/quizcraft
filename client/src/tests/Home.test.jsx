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

  it("should update local state cleanly and enable Join button when typing exactly 6 numeric characters", async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText("000000");
    const joinButton = screen.getByRole("button", { name: /^join$/i });

    // 1. Initial State: Input is empty, Join button is disabled
    expect(input.value).toBe("");
    expect(joinButton).toBeDisabled();

    // 2. Typing non-numeric input should be stripped
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input.value).toBe("");
    expect(joinButton).toBeDisabled();

    // 3. Typing 3 digits
    fireEvent.change(input, { target: { value: "123" } });
    expect(input.value).toBe("123");
    expect(joinButton).toBeDisabled();

    // 4. Typing 6 digits
    fireEvent.change(input, { target: { value: "123456" } });
    expect(input.value).toBe("123456");
    expect(joinButton).not.toBeDisabled();

    // 5. Attempting to type more than 6 digits (should trim at 6)
    fireEvent.change(input, { target: { value: "1234567" } });
    expect(input.value).toBe("123456");
    expect(joinButton).not.toBeDisabled();
  });
});
