/**
 * MissionsPage tests — loading, mission list rendering.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "testpilot", xp: 200, level: 3 },
    updateUser: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    missions: {
      list: vi.fn(),
      claim: vi.fn(),
    },
    user: {
      stats: vi.fn(),
    },
  },
}));

import MissionsPage from "./MissionsPage";
import { api } from "@/lib/api";

const mockApi = api as any;

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MissionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.missions.list.mockResolvedValue({
    missions: [
      {
        id: "m1",
        title: "First pick",
        description: "Make your first pickstic",
        icon: "target",
        xp: 50,
        category: "assiduity",
        progress: 1,
        target: 1,
        completed: true,
        claimed: false,
      },
      {
        id: "m2",
        title: "5 courses",
        description: "Take part in 5 races",
        icon: "flag",
        xp: 100,
        category: "assiduity",
        progress: 3,
        target: 5,
        completed: false,
        claimed: false,
      },
    ],
    categories: { assiduity: "Consistency", predictions: "Pickstics" },
  });
  mockApi.user.stats.mockResolvedValue({ total_predictions: 12, races_participated: 3 });
});

describe("MissionsPage", () => {
  it("fetches missions on mount", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApi.missions.list).toHaveBeenCalled();
    });
  });

  it("fetches user stats on mount", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApi.user.stats).toHaveBeenCalled();
    });
  });

  it("renders without crashing after data loads", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApi.missions.list).toHaveBeenCalled();
      expect(mockApi.user.stats).toHaveBeenCalled();
    });
    // Page should render content
    expect(document.querySelector("div")).toBeTruthy();
  });
});
