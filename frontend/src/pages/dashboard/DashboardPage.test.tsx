/**
 * DashboardPage — component tests.
 *
 * Covers: loading state, user greeting, upcoming race card, no-league CTA.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, mockUser } from "@/test/utils";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  const unwrap = (p: Promise<{ data: unknown }>) => p.then((r) => r.data);
  return {
    apiClient: mockApiClient,
    API: "http://localhost:8000/api",
    api: {
      races: {
        upcoming: () => unwrap(mockApiClient.get("/races/upcoming")),
        list: () => unwrap(mockApiClient.get("/races")),
      },
      avatars: {
        list: () => unwrap(mockApiClient.get("/avatars")),
      },
      leagues: {
        my: () => unwrap(mockApiClient.get("/leagues/my")),
        unreadMessages: () => unwrap(mockApiClient.get("/leagues/unread-messages")),
      },
      predictions: {
        get: (raceId: string) => unwrap(mockApiClient.get(`/predictions/race/${raceId}`)),
        history: () => unwrap(mockApiClient.get("/predictions/history")),
      },
      notifications: {
        unreadCount: () => unwrap(mockApiClient.get("/notifications/unread-count")),
      },
    },
    getApiError: (e: unknown, fallback = "Erreur") => {
      const err = e as { response?: { data?: { detail?: string } } };
      return err.response?.data?.detail || fallback;
    },
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import DashboardPage from "./DashboardPage";

beforeEach(() => {
  vi.clearAllMocks();
});

function setupApiResponses(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    "/races/upcoming": [
      {
        id: "race-1",
        name: "GP de Monaco",
        round: 6,
        status: "upcoming",
        predictions_close_at: "2026-06-01T14:00:00Z",
        is_sprint_weekend: false,
        circuit_name: "Monte Carlo",
        country: "Monaco",
        flag_emoji: "🇲🇨",
      },
    ],
    "/races": [
      {
        id: "race-1",
        name: "GP de Monaco",
        round: 6,
        status: "upcoming",
        date: "2026-06-07T13:00:00Z",
        predictions_close_at: "2026-06-01T14:00:00Z",
        is_sprint_weekend: false,
        circuit: "Monte Carlo",
        country: "Monaco",
        can_predict: true,
      },
    ],
    "/predictions/history": [],
    "/avatars": { all: [{ id: "1", name: "Default", url: "/avatars/default.png" }] },
    "/leagues/my": [{ id: "league-1", name: "Les Pistonnés" }],
    "/leagues/unread-messages": { by_league: {} },
    "/predictions/race/race-1": null,
    "/notifications/unread-count": { count: 0 },
    ...overrides,
  };

  mockApiClient.get.mockImplementation((url: string) => {
    const data = defaults[url] ?? null;
    return Promise.resolve({ data });
  });
}

describe("DashboardPage", () => {
  it("shows loading skeleton initially", () => {
    mockApiClient.get.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderWithProviders(<DashboardPage />, { user: mockUser });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders user username after load", async () => {
    setupApiResponses();
    renderWithProviders(<DashboardPage />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByText("max33")).toBeInTheDocument();
    });
  });

  it("shows upcoming race name", async () => {
    setupApiResponses();
    renderWithProviders(<DashboardPage />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getAllByText(/Monaco/i).length).toBeGreaterThan(0);
    });
  });

  it("shows no-league CTA when user has no leagues", async () => {
    setupApiResponses({ "/leagues/my": [] });
    renderWithProviders(<DashboardPage />, {
      user: { ...mockUser, current_league_id: null },
    });

    await waitFor(() => {
      expect(screen.getByText("Rejoins une Ligue !")).toBeInTheDocument();
    });
  });
});
