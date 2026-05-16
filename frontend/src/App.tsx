/**
 * Root application component — routing + providers.
 *
 * Sprint 3 refactor: auth, api client, and constants extracted to lib/.
 * Sprint 4: lazy() code-splitting — each page is a separate chunk.
 * This file is now pure orchestration (providers + route table).
 */
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "@/App.css";

// --- lazy page imports (code-split: each page = separate chunk) ----------
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const SetUsernamePage = lazy(() => import("@/pages/SetUsernamePage"));
const LeaguePage = lazy(() => import("@/pages/LeaguePage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const RaceCalendarPage = lazy(() => import("@/pages/RaceCalendarPage"));
const PredictionsPage = lazy(() => import("@/pages/predictions/PredictionsPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const ResultsPage = lazy(() => import("@/pages/ResultsPage"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const MiniGamesPage = lazy(() => import("@/pages/MiniGamesPage"));
const MissionsPage = lazy(() => import("@/pages/MissionsPage"));
const GlobalLeaderboardPage = lazy(() => import("@/pages/GlobalLeaderboardPage"));
const CustomPredictionsPage = lazy(
  () => import("@/pages/custom-predictions/CustomPredictionsPage"),
);
const GrandPrixDetailPage = lazy(() => import("@/pages/GrandPrixDetailPage"));
const LeagueChatPage = lazy(() => import("@/pages/LeagueChatPage"));
const MemberProfilePage = lazy(() => import("@/pages/MemberProfilePage"));
const LeagueDetailPage = lazy(() => import("@/pages/leagues/LeagueDetailPage"));
const JoinLeaguePage = lazy(() => import("@/pages/JoinLeaguePage"));
const ChampionshipPage = lazy(() => import("@/pages/championship/ChampionshipPage"));
const DriverDetailPage = lazy(() => import("@/pages/driver-detail/DriverDetailPage"));
const DriverComparisonPage = lazy(() => import("@/pages/driver-comparison/DriverComparisonPage"));

// BottomNav stays eagerly loaded (present on every page)
import BottomNav from "@/components/BottomNav";

// --------------------------------------------------------- suspense fallback ---

function PageLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)" }}
    >
      <div className="w-14 h-14 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
      <p className="text-sm text-gray-500 animate-pulse">Chargement...</p>
    </div>
  );
}

// ------------------------------------------------------------------ layout ---

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideNav = ["/auth", "/set-username"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-safe"} role="main">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </ErrorBoundary>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

// ------------------------------------------------------------------ router ---

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/auth"
        element={
          user ? (
            <Navigate
              to={user.username ? (user.current_league_id ? "/" : "/league") : "/set-username"}
              replace
            />
          ) : (
            <AuthPage />
          )
        }
      />

      {/* Protected */}
      <Route
        path="/set-username"
        element={
          <ProtectedRoute>
            {user?.username ? (
              <Navigate to={user.current_league_id ? "/" : "/league"} replace />
            ) : (
              <SetUsernamePage />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/league"
        element={
          <ProtectedRoute>
            {!user?.username ? <Navigate to="/set-username" replace /> : <LeaguePage />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {!user?.username ? (
              <Navigate to="/set-username" replace />
            ) : !user?.current_league_id ? (
              <Navigate to="/league" replace />
            ) : (
              <DashboardPage />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/predictions"
        element={
          <ProtectedRoute>
            <RaceCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/predictions/:raceId"
        element={
          <ProtectedRoute>
            <PredictionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/championship"
        element={
          <ProtectedRoute>
            <ChampionshipPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results/:raceId"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/minigames"
        element={
          <ProtectedRoute>
            <MiniGamesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <ProtectedRoute>
            <MissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard/global"
        element={
          <ProtectedRoute>
            <GlobalLeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/custom-predictions"
        element={
          <ProtectedRoute>
            <CustomPredictionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/custom-predictions/:leagueId"
        element={
          <ProtectedRoute>
            <CustomPredictionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/race/:raceId"
        element={
          <ProtectedRoute>
            <GrandPrixDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/league/:leagueId/chat"
        element={
          <ProtectedRoute>
            <LeagueChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/league/:leagueId/details"
        element={
          <ProtectedRoute>
            <LeagueDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:userId"
        element={
          <ProtectedRoute>
            <MemberProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:code"
        element={
          <ProtectedRoute>
            <JoinLeaguePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/:driverId"
        element={
          <ProtectedRoute>
            <DriverDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compare"
        element={
          <ProtectedRoute>
            <DriverComparisonPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --------------------------------------------------------------------- app ---

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppLayout>
              <AppRouter />
            </AppLayout>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#121214",
                  color: "#fafafa",
                  border: "1px solid rgba(255,255,255,0.1)",
                },
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
