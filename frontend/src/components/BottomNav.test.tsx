/**
 * BottomNav tests — rendering, active state, navigation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1", username: "testpilot" } }),
}));

import BottomNav from "./BottomNav";

beforeEach(() => {
  vi.clearAllMocks();
});

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe("BottomNav", () => {
  it("renders all 5 nav items", () => {
    renderNav();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    expect(screen.getByTestId("nav-accueil")).toBeInTheDocument();
    expect(screen.getByTestId("nav-pronos")).toBeInTheDocument();
    expect(screen.getByTestId("nav-direct")).toBeInTheDocument();
    expect(screen.getByTestId("nav-classements")).toBeInTheDocument();
    expect(screen.getByTestId("nav-profil")).toBeInTheDocument();
  });

  it("marks current path as active with aria-current", () => {
    renderNav("/predictions");
    expect(screen.getByTestId("nav-pronos")).toHaveAttribute("aria-current", "page");
    expect(screen.getByTestId("nav-accueil")).not.toHaveAttribute("aria-current");
  });

  it("navigates on click", async () => {
    renderNav("/");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("nav-pronos"));
    expect(mockNavigate).toHaveBeenCalledWith("/predictions");
  });

  it("navigates to leaderboard on click", async () => {
    renderNav("/");
    const user = userEvent.setup();
    await user.click(screen.getByTestId("nav-classements"));
    expect(mockNavigate).toHaveBeenCalledWith("/leaderboard");
  });
});
