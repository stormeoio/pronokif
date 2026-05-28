/**
 * Application route definitions.
 * Extracted from App.tsx (Sprint 4 S3-T3: App.tsx < 150L).
 */
import { lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ProtectedRoute, useAuth } from "@/lib/auth";

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
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/pages/VerifyEmailPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const AdminAuthPage = lazy(() => import("@/pages/admin-bo/AdminAuthPage"));
const AdminLayout = lazy(() => import("@/pages/admin-bo/AdminLayout"));

// --- Simple protected routes (path → component) ---
const PROTECTED_ROUTES: Array<{ path: string; element: React.ReactNode }> = [
  { path: "/predictions", element: <RaceCalendarPage /> },
  { path: "/predictions/:raceId", element: <PredictionsPage /> },
  { path: "/leaderboard", element: <LeaderboardPage /> },
  { path: "/championship", element: <ChampionshipPage /> },
  { path: "/results", element: <ResultsPage /> },
  { path: "/results/:raceId", element: <ResultsPage /> },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/minigames", element: <MiniGamesPage /> },
  { path: "/missions", element: <MissionsPage /> },
  { path: "/leaderboard/global", element: <GlobalLeaderboardPage /> },
  { path: "/custom-predictions", element: <CustomPredictionsPage /> },
  { path: "/custom-predictions/:leagueId", element: <CustomPredictionsPage /> },
  { path: "/race/:raceId", element: <GrandPrixDetailPage /> },
  { path: "/league/:leagueId/chat", element: <LeagueChatPage /> },
  { path: "/league/:leagueId/details", element: <LeagueDetailPage /> },
  { path: "/profile/:userId", element: <MemberProfilePage /> },
  { path: "/join/:code", element: <JoinLeaguePage /> },
  { path: "/driver/:driverId", element: <DriverDetailPage /> },
  { path: "/compare", element: <DriverComparisonPage /> },
];

// --- Loading fallback (reused in App.tsx) ---
export function PageLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)" }}
    >
      <div className="w-14 h-14 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
      <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
    </div>
  );
}

function AdminEntry() {
  const location = useLocation();
  const hasMagicToken = new URLSearchParams(location.search).has("token");

  return hasMagicToken ? <AdminAuthPage /> : <AdminLayout />;
}

// --- Router component ---
export function AppRouter() {
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

      {/* Onboarding routes with redirects */}
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

      {/* Standard protected routes */}
      {PROTECTED_ROUTES.map(({ path, element }) => (
        <Route key={path} path={path} element={<ProtectedRoute>{element}</ProtectedRoute>} />
      ))}

      {/* Public auth-related pages */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Admin Back-Office (separate auth) */}
      <Route path="/admin/auth" element={<AdminAuthPage />} />
      <Route path="/admin" element={<AdminEntry />} />
      <Route path="/bo-admin/auth" element={<Navigate to="/admin/auth" replace />} />
      <Route path="/bo-admin" element={<Navigate to="/admin" replace />} />
      <Route path="/admin-bo/auth" element={<Navigate to="/admin/auth" replace />} />
      <Route path="/admin-bo" element={<Navigate to="/admin" replace />} />

      {/* 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
