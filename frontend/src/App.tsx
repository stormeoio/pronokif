/**
 * Root application component — routing + providers.
 *
 * Sprint 3 refactor: auth, api client, and constants extracted to lib/.
 * This file is now pure orchestration (providers + route table).
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider, ProtectedRoute, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import "@/App.css";

// --- lazy-safe page imports (kept static for now; code-split in S4) -------
import AuthPage from "@/pages/AuthPage";
import SetUsernamePage from "@/pages/SetUsernamePage";
import LeaguePage from "@/pages/LeaguePage";
import DashboardPage from "@/pages/DashboardPage";
import RaceCalendarPage from "@/pages/RaceCalendarPage";
import PredictionsPage from "@/pages/PredictionsPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ResultsPage from "@/pages/ResultsPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import NotificationsPage from "@/pages/NotificationsPage";
import MiniGamesPage from "@/pages/MiniGamesPage";
import MissionsPage from "@/pages/MissionsPage";
import GlobalLeaderboardPage from "@/pages/GlobalLeaderboardPage";
import CustomPredictionsPage from "@/pages/CustomPredictionsPage";
import GrandPrixDetailPage from "@/pages/GrandPrixDetailPage";
import LeagueChatPage from "@/pages/LeagueChatPage";
import MemberProfilePage from "@/pages/MemberProfilePage";
import LeagueDetailPage from "@/pages/LeagueDetailPage";
import JoinLeaguePage from "@/pages/JoinLeaguePage";
import ChampionshipPage from "@/pages/ChampionshipPage";
import DriverDetailPage from "@/pages/DriverDetailPage";
import DriverComparisonPage from "@/pages/DriverComparisonPage";
import BottomNav from "@/components/BottomNav";

// ------------------------------------------------------------------ layout ---

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideNav = ["/auth", "/set-username"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-safe"}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

// ------------------------------------------------------------------ router ---

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
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
      <Route path="/set-username" element={<ProtectedRoute>{user?.username ? <Navigate to={user.current_league_id ? "/" : "/league"} replace /> : <SetUsernamePage />}</ProtectedRoute>} />
      <Route path="/league" element={<ProtectedRoute>{!user?.username ? <Navigate to="/set-username" replace /> : <LeaguePage />}</ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute>{!user?.username ? <Navigate to="/set-username" replace /> : !user?.current_league_id ? <Navigate to="/league" replace /> : <DashboardPage />}</ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><RaceCalendarPage /></ProtectedRoute>} />
      <Route path="/predictions/:raceId" element={<ProtectedRoute><PredictionsPage /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
      <Route path="/championship" element={<ProtectedRoute><ChampionshipPage /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/results/:raceId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/minigames" element={<ProtectedRoute><MiniGamesPage /></ProtectedRoute>} />
      <Route path="/missions" element={<ProtectedRoute><MissionsPage /></ProtectedRoute>} />
      <Route path="/leaderboard/global" element={<ProtectedRoute><GlobalLeaderboardPage /></ProtectedRoute>} />
      <Route path="/custom-predictions" element={<ProtectedRoute><CustomPredictionsPage /></ProtectedRoute>} />
      <Route path="/custom-predictions/:leagueId" element={<ProtectedRoute><CustomPredictionsPage /></ProtectedRoute>} />
      <Route path="/race/:raceId" element={<ProtectedRoute><GrandPrixDetailPage /></ProtectedRoute>} />
      <Route path="/league/:leagueId/chat" element={<ProtectedRoute><LeagueChatPage /></ProtectedRoute>} />
      <Route path="/league/:leagueId/details" element={<ProtectedRoute><LeagueDetailPage /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<ProtectedRoute><MemberProfilePage /></ProtectedRoute>} />
      <Route path="/join/:code" element={<ProtectedRoute><JoinLeaguePage /></ProtectedRoute>} />
      <Route path="/driver/:driverId" element={<ProtectedRoute><DriverDetailPage /></ProtectedRoute>} />
      <Route path="/compare" element={<ProtectedRoute><DriverComparisonPage /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --------------------------------------------------------------------- app ---

export default function App() {
  return (
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
  );
}
