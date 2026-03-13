import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";

// Pages
import AuthPage from "./pages/AuthPage";
import SetUsernamePage from "./pages/SetUsernamePage";
import LeaguePage from "./pages/LeaguePage";
import DashboardPage from "./pages/DashboardPage";
import RaceCalendarPage from "./pages/RaceCalendarPage";
import PredictionsPage from "./pages/PredictionsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ResultsPage from "./pages/ResultsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import NotificationsPage from "./pages/NotificationsPage";
import MiniGamesPage from "./pages/MiniGamesPage";
import MissionsPage from "./pages/MissionsPage";
import GlobalLeaderboardPage from "./pages/GlobalLeaderboardPage";
import CustomPredictionsPage from "./pages/CustomPredictionsPage";

// Components
import BottomNav from "./components/BottomNav";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// API client with auth
export const apiClient = axios.create({
  baseURL: API,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      apiClient.get("/auth/me")
        .then(res => {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (email, password) => {
    const res = await apiClient.post("/auth/register", { email, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const setUsername = async (username) => {
    const res = await apiClient.post("/auth/username", { username });
    setUser(res.data);
    localStorage.setItem("user", JSON.stringify(res.data));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updates) => {
    const newUser = { ...user, ...updates };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUsername, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

// App Layout with Bottom Nav
function AppLayout({ children }) {
  const location = useLocation();
  const hideNav = ["/auth", "/set-username", "/league"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-safe"}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

// Main Router
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
      {/* Public Route */}
      <Route path="/auth" element={
        user ? <Navigate to={user.username ? (user.current_league_id ? "/" : "/league") : "/set-username"} replace /> : <AuthPage />
      } />

      {/* Protected Routes */}
      <Route path="/set-username" element={
        <ProtectedRoute>
          {user?.username ? <Navigate to={user.current_league_id ? "/" : "/league"} replace /> : <SetUsernamePage />}
        </ProtectedRoute>
      } />

      <Route path="/league" element={
        <ProtectedRoute>
          {!user?.username ? <Navigate to="/set-username" replace /> : <LeaguePage />}
        </ProtectedRoute>
      } />

      <Route path="/" element={
        <ProtectedRoute>
          {!user?.username ? <Navigate to="/set-username" replace /> : 
           !user?.current_league_id ? <Navigate to="/league" replace /> : <DashboardPage />}
        </ProtectedRoute>
      } />

      <Route path="/predictions" element={
        <ProtectedRoute>
          <RaceCalendarPage />
        </ProtectedRoute>
      } />

      <Route path="/predictions/:raceId" element={
        <ProtectedRoute>
          <PredictionsPage />
        </ProtectedRoute>
      } />

      <Route path="/leaderboard" element={
        <ProtectedRoute>
          <LeaderboardPage />
        </ProtectedRoute>
      } />

      <Route path="/results" element={
        <ProtectedRoute>
          <ResultsPage />
        </ProtectedRoute>
      } />

      <Route path="/results/:raceId" element={
        <ProtectedRoute>
          <ResultsPage />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      } />

      <Route path="/notifications" element={
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      } />

      <Route path="/minigames" element={
        <ProtectedRoute>
          <MiniGamesPage />
        </ProtectedRoute>
      } />

      <Route path="/missions" element={
        <ProtectedRoute>
          <MissionsPage />
        </ProtectedRoute>
      } />

      <Route path="/leaderboard/global" element={
        <ProtectedRoute>
          <GlobalLeaderboardPage />
        </ProtectedRoute>
      } />

      <Route path="/custom-predictions" element={
        <ProtectedRoute>
          <CustomPredictionsPage />
        </ProtectedRoute>
      } />

      <Route path="/custom-predictions/:leagueId" element={
        <ProtectedRoute>
          <CustomPredictionsPage />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <AppRouter />
        </AppLayout>
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: '#121214',
              color: '#fafafa',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
