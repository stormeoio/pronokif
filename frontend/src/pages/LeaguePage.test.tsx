/**
 * LeaguePage — onboarding tests.
 *
 * Covers the first league step after signup: default create flow, join-code switch,
 * and progression once the first league is joined.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import LeaguePage from "./LeaguePage";

const mockNavigate = vi.fn();
const mockUpdateUser = vi.fn();

const mockAuth = vi.hoisted(() => ({
  user: {
    id: "u1",
    email: "pilot@pronokif.com",
    username: "PilotFlow",
    current_league_id: null as string | null,
    level: 1,
    xp: 0,
  },
  updateUser: vi.fn(),
}));

const mockApi = vi.hoisted(() => ({
  leagues: {
    my: vi.fn(),
    unreadMessages: vi.fn(),
    join: vi.fn(),
    create: vi.fn(),
  },
  avatars: {
    list: vi.fn(),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mockAuth.user,
    updateUser: mockUpdateUser,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: mockApi,
}));

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LeaguePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.user = {
    id: "u1",
    email: "pilot@pronokif.com",
    username: "PilotFlow",
    current_league_id: null,
    level: 1,
    xp: 0,
  };
  mockApi.leagues.my.mockResolvedValue([]);
  mockApi.leagues.unreadMessages.mockResolvedValue({ by_league: {} });
  mockApi.avatars.list.mockResolvedValue({ all: [] });
  mockApi.leagues.join.mockResolvedValue({
    id: "league-1",
    name: "Les Pistonnés",
    code: "ABC123",
    members: ["u1"],
  });
  mockApi.leagues.create.mockResolvedValue({
    id: "league-1",
    name: "Les Pistonnés",
    code: "ABC123",
    members: ["u1"],
  });
});

describe("LeaguePage onboarding", () => {
  it("puts the first-league onboarding before the empty league list", async () => {
    renderPage();

    const onboarding = await screen.findByTestId("league-onboarding");
    expect(onboarding).toBeInTheDocument();
    expect(within(onboarding).getByTestId("league-onboarding-user")).toBeInTheDocument();
    expect(within(onboarding).getByText("PilotFlow")).toBeInTheDocument();
    expect(await screen.findByTestId("league-name-input")).toBeInTheDocument();
    expect(screen.queryByTestId("league-list-empty")).not.toBeInTheDocument();
  });

  it("switches from create to join through the visual onboarding choice", async () => {
    renderPage();

    fireEvent.click(await screen.findByTestId("league-onboarding-join"));

    await waitFor(() => {
      expect(screen.getByTestId("join-code-input")).toBeInTheDocument();
    });
  });

  it("advances to the dashboard after joining the first league", async () => {
    renderPage();

    fireEvent.click(await screen.findByTestId("league-onboarding-join"));
    fireEvent.change(await screen.findByTestId("join-code-input"), {
      target: { value: "abc123" },
    });
    fireEvent.submit(screen.getByTestId("join-btn").closest("form")!);

    await waitFor(() => {
      expect(mockApi.leagues.join).toHaveBeenCalledWith({ code: "ABC123" });
      expect(mockUpdateUser).toHaveBeenCalledWith({ current_league_id: "league-1" });
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
