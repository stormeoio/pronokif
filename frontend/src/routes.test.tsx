/**
 * Routes module tests — AppRouter, PageLoader, route redirects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { PageLoader } from "./routes";

// Mock auth
const mockUser = { id: "u1", username: "testuser", current_league_id: "league1" };
let mockAuthState = { user: mockUser, loading: false };

vi.mock("@/lib/auth", () => ({
  useAuth: () => mockAuthState,
  ProtectedRoute: ({ children }: { children: React.ReactNode }) =>
    mockAuthState.user ? <>{children}</> : <div>Login required</div>,
}));

// Mock all lazy pages to avoid loading actual components
vi.mock("@/pages/AuthPage", () => ({ default: () => <div>AuthPage</div> }));
vi.mock("@/pages/SetUsernamePage", () => ({ default: () => <div>SetUsernamePage</div> }));
vi.mock("@/pages/LeaguePage", () => ({ default: () => <div>LeaguePage</div> }));
vi.mock("@/pages/dashboard/DashboardPage", () => ({ default: () => <div>DashboardPage</div> }));
vi.mock("@/pages/RaceCalendarPage", () => ({ default: () => <div>RaceCalendarPage</div> }));
vi.mock("@/pages/predictions/PredictionsPage", () => ({
  default: () => <div>PredictionsPage</div>,
}));
vi.mock("@/pages/LeaderboardPage", () => ({ default: () => <div>LeaderboardPage</div> }));
vi.mock("@/pages/ResultsPage", () => ({ default: () => <div>ResultsPage</div> }));
vi.mock("@/pages/profile/ProfilePage", () => ({ default: () => <div>ProfilePage</div> }));
vi.mock("@/pages/NotificationsPage", () => ({ default: () => <div>NotificationsPage</div> }));
vi.mock("@/pages/MiniGamesPage", () => ({ default: () => <div>MiniGamesPage</div> }));
vi.mock("@/pages/MissionsPage", () => ({ default: () => <div>MissionsPage</div> }));
vi.mock("@/pages/NotFoundPage", () => ({ default: () => <div>NotFoundPage</div> }));
vi.mock("@/pages/GlobalLeaderboardPage", () => ({
  default: () => <div>GlobalLeaderboardPage</div>,
}));
vi.mock("@/pages/custom-predictions/CustomPredictionsPage", () => ({
  default: () => <div>CustomPredictionsPage</div>,
}));
vi.mock("@/pages/GrandPrixDetailPage", () => ({ default: () => <div>GrandPrixDetailPage</div> }));
vi.mock("@/pages/LeagueChatPage", () => ({ default: () => <div>LeagueChatPage</div> }));
vi.mock("@/pages/MemberProfilePage", () => ({ default: () => <div>MemberProfilePage</div> }));
vi.mock("@/pages/leagues/LeagueDetailPage", () => ({ default: () => <div>LeagueDetailPage</div> }));
vi.mock("@/pages/JoinLeaguePage", () => ({ default: () => <div>JoinLeaguePage</div> }));
vi.mock("@/pages/championship/ChampionshipPage", () => ({
  default: () => <div>ChampionshipPage</div>,
}));
vi.mock("@/pages/driver-detail/DriverDetailPage", () => ({
  default: () => <div>DriverDetailPage</div>,
}));
vi.mock("@/pages/driver-comparison/DriverComparisonPage", () => ({
  default: () => <div>DriverComparisonPage</div>,
}));
vi.mock("@/pages/admin-bo/AdminAuthPage", () => ({ default: () => <div>AdminAuthPage</div> }));
vi.mock("@/pages/admin-bo/AdminLayout", () => ({ default: () => <div>AdminLayout</div> }));

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderRoute(path: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        {/* Import AppRouter dynamically to apply mocks */}
        <TestRouter />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// We need a separate import because vi.mock is hoisted
import { AppRouter } from "./routes";
function TestRouter() {
  return <AppRouter />;
}

beforeEach(() => {
  mockAuthState = { user: mockUser, loading: false };
});

describe("PageLoader", () => {
  it("renders a spinner with loading text", () => {
    render(<PageLoader />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

describe("AppRouter", () => {
  it("renders DashboardPage at / for authenticated user with league", async () => {
    renderRoute("/");
    expect(await screen.findByText("DashboardPage")).toBeInTheDocument();
  });

  it("redirects / to /set-username when user has no username", async () => {
    mockAuthState = { user: { ...mockUser, username: "" } as any, loading: false };
    renderRoute("/");
    expect(await screen.findByText("SetUsernamePage")).toBeInTheDocument();
  });

  it("redirects / to /league when user has no current_league_id", async () => {
    mockAuthState = { user: { ...mockUser, current_league_id: null } as any, loading: false };
    renderRoute("/");
    expect(await screen.findByText("LeaguePage")).toBeInTheDocument();
  });

  it("renders AuthPage at /auth for unauthenticated user", async () => {
    mockAuthState = { user: null as any, loading: false };
    renderRoute("/auth");
    expect(await screen.findByText("AuthPage")).toBeInTheDocument();
  });

  it("redirects /auth to / for authenticated user", async () => {
    renderRoute("/auth");
    expect(await screen.findByText("DashboardPage")).toBeInTheDocument();
  });

  it("renders protected route /predictions", async () => {
    renderRoute("/predictions");
    expect(await screen.findByText("RaceCalendarPage")).toBeInTheDocument();
  });

  it("renders protected route /profile", async () => {
    renderRoute("/profile");
    expect(await screen.findByText("ProfilePage")).toBeInTheDocument();
  });

  it("renders protected route /minigames", async () => {
    renderRoute("/minigames");
    expect(await screen.findByText("MiniGamesPage")).toBeInTheDocument();
  });

  it("renders the admin back-office at /admin", async () => {
    renderRoute("/admin");
    expect(await screen.findByText("AdminLayout")).toBeInTheDocument();
  });

  it("renders admin auth at /admin when a magic token is present", async () => {
    renderRoute("/admin?token=abc123");
    expect(await screen.findByText("AdminAuthPage")).toBeInTheDocument();
  });

  it("renders the admin auth page at /admin/auth", async () => {
    renderRoute("/admin/auth");
    expect(await screen.findByText("AdminAuthPage")).toBeInTheDocument();
  });

  it("redirects legacy /bo-admin route to /admin", async () => {
    renderRoute("/bo-admin");
    expect(await screen.findByText("AdminLayout")).toBeInTheDocument();
  });

  it("redirects legacy /bo-admin/auth route to /admin/auth", async () => {
    renderRoute("/bo-admin/auth");
    expect(await screen.findByText("AdminAuthPage")).toBeInTheDocument();
  });

  it("redirects legacy /admin-bo route to /admin", async () => {
    renderRoute("/admin-bo");
    expect(await screen.findByText("AdminLayout")).toBeInTheDocument();
  });

  it("redirects legacy /admin-bo/auth route to /admin/auth", async () => {
    renderRoute("/admin-bo/auth");
    expect(await screen.findByText("AdminAuthPage")).toBeInTheDocument();
  });

  it("renders NotFoundPage for unknown routes", async () => {
    renderRoute("/unknown-page-xyz");
    expect(await screen.findByText("NotFoundPage")).toBeInTheDocument();
  });

  it("shows PageLoader when auth is loading", () => {
    mockAuthState = { user: null as any, loading: true };
    renderRoute("/");
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
