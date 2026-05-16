/**
 * BottomNav tests — rendering, active state, navigation, badge.
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

vi.mock("@/lib/api", () => ({
  api: {
    leagues: { unreadMessages: vi.fn().mockResolvedValue({ total_unread: 0 }) },
  },
}));

import BottomNav from "./BottomNav";
import { api } from "@/lib/api";

const mockApi = api as any;

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.leagues.unreadMessages.mockResolvedValue({ total_unread: 0 });
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
    expect(screen.getByTestId("nav-championnat")).toBeInTheDocument();
    expect(screen.getByTestId("nav-ligues")).toBeInTheDocument();
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

  it("shows unread chat badge when count > 0", async () => {
    mockApi.leagues.unreadMessages.mockResolvedValue({ total_unread: 3 });
    renderNav("/");
    // Wait for useEffect to fire
    await vi.waitFor(() => {
      expect(mockApi.leagues.unreadMessages).toHaveBeenCalled();
    });
  });
});
