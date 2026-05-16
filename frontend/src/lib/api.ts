/**
 * Typed API client for Pronokif.
 *
 * - `apiClient` — raw axios instance (legacy, backward-compat)
 * - `api` — typed helper object returning unwrapped data
 *
 * Usage with useQuery:
 *   queryFn: () => api.races.list()
 *   queryFn: () => api.leagues.my()
 */
import axios from "axios";
import type {
  AvatarsResponse,
  ChatMessageResponse,
  CustomPrediction,
  Driver,
  DriverComparison,
  DriverDetails,
  FeedbackItem,
  GlobalLeaderboardResponse,
  League,
  LeaderboardEntry,
  LeagueMember,
  LeaguePreview,
  MinigameAttempts,
  MinigameLeaderboardEntry,
  MissionClaimResponse,
  MissionsResponse,
  Notification,
  PointsHistoryEntry,
  Prediction,
  PredictionStats,
  Race,
  RaceDetails,
  ResultsResponse,
  TokenResponse,
  UnreadMessages,
  User,
  AdminMember,
} from "@/types/api";

// ═══════════════════════════════════════ CONFIG ═══════════════════════════════

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

/** Absolute base for REST calls, e.g. "http://localhost:8000/api". */
export const API = `${BACKEND_URL}/api`;

/** Pre-configured axios instance — attaches JWT and handles 401. */
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
  },
);

// ═══════════════════════════════════════ TYPED HELPERS ════════════════════════

/** Unwrap axios response to just `.data` with proper typing. */
async function get<T>(url: string): Promise<T> {
  const res = await apiClient.get<T>(url);
  return res.data;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<T>(url, body);
  return res.data;
}

async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<T>(url, body);
  return res.data;
}

async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<T>(url, body);
  return res.data;
}

async function del<T = void>(url: string): Promise<T> {
  const res = await apiClient.delete<T>(url);
  return res.data;
}

// ═══════════════════════════════════════ TYPED API OBJECT ═════════════════════

export const api = {
  // ── Auth ─────────────────────────────────────────────────────
  auth: {
    login: (body: { email: string; password: string }) => post<TokenResponse>("/auth/login", body),
    register: (body: { email: string; password: string; username: string }) =>
      post<TokenResponse>("/auth/register", body),
    me: () => get<User>("/auth/me"),
    updateProfile: (body: Partial<User>) => patch<User>("/auth/me", body),
  },

  // ── Races ────────────────────────────────────────────────────
  races: {
    list: () => get<Race[]>("/races"),
    next: () => get<Race>("/races/next"),
    get: (id: string) => get<RaceDetails>(`/races/${id}`),
    results: (raceId: string) => get<ResultsResponse>(`/races/${raceId}/results`),
  },

  // ── Drivers ──────────────────────────────────────────────────
  drivers: {
    list: () => get<Driver[]>("/drivers"),
    get: (id: string) => get<DriverDetails>(`/drivers/${id}`),
    compare: (id1: string, id2: string) => get<DriverComparison>(`/drivers/compare/${id1}/${id2}`),
  },

  // ── Leagues ──────────────────────────────────────────────────
  leagues: {
    my: () => get<League[]>("/leagues/my"),
    get: (id: string) => get<League>(`/leagues/${id}`),
    create: (body: { name: string }) => post<League>("/leagues", body),
    join: (body: { code: string }) => post<League>("/leagues/join", body),
    leave: (id: string) => post<void>(`/leagues/${id}/leave`),
    members: (id: string) => get<LeagueMember[]>(`/leagues/${id}/members`),
    leaderboard: (id: string) => get<LeaderboardEntry[]>(`/leagues/${id}/leaderboard`),
    unreadMessages: () => get<UnreadMessages>("/leagues/unread-messages"),
    preview: (code: string) => get<LeaguePreview>(`/leagues/preview/${code}`),
  },

  // ── Chat ─────────────────────────────────────────────────────
  chat: {
    messages: (leagueId: string, limit = 50) =>
      get<ChatMessageResponse[]>(`/leagues/${leagueId}/chat?limit=${limit}`),
    send: (leagueId: string, body: { content: string }) =>
      post<ChatMessageResponse>(`/leagues/${leagueId}/chat`, body),
    markRead: (leagueId: string) => post<void>(`/leagues/${leagueId}/chat/read`),
  },

  // ── Predictions ──────────────────────────────────────────────
  predictions: {
    get: (raceId: string) => get<Prediction>(`/predictions/${raceId}`),
    save: (raceId: string, body: Partial<Prediction>) =>
      post<Prediction>(`/predictions/${raceId}`, body),
    lock: (raceId: string) => post<Prediction>(`/predictions/${raceId}/lock`),
    stats: () => get<PredictionStats>("/predictions/stats"),
    history: () => get<PointsHistoryEntry[]>("/predictions/history"),
  },

  // ── Custom Predictions ───────────────────────────────────────
  customPredictions: {
    list: (raceId: string, leagueId: string) =>
      get<CustomPrediction[]>(`/custom-predictions/${raceId}/${leagueId}`),
    create: (body: Partial<CustomPrediction>) =>
      post<CustomPrediction>("/custom-predictions", body),
  },

  // ── Leaderboard ──────────────────────────────────────────────
  leaderboard: {
    global: (limit = 100) => get<GlobalLeaderboardResponse>(`/leaderboard/global?limit=${limit}`),
  },

  // ── Minigames ────────────────────────────────────────────────
  minigames: {
    submitReaction: (body: {
      race_id: string;
      league_id: string;
      reaction_time_ms: number;
      is_training: boolean;
    }) => post<void>("/minigames/reaction", body),
    submitBatak: (body: {
      race_id: string;
      league_id: string;
      score: number;
      time_seconds: number;
      is_training: boolean;
    }) => post<void>("/minigames/batak", body),
    attempts: (game: string, scope: string, raceId: string) =>
      get<MinigameAttempts>(`/minigames/attempts/${game}/${scope}/${raceId}`),
    leaderboard: (game: string, leagueId: string, raceId: string) =>
      get<{ leaderboard: MinigameLeaderboardEntry[] }>(
        `/minigames/leaderboard/${game}/${leagueId}/${raceId}`,
      ),
    globalLeaderboard: (game: string) =>
      get<{ leaderboard: MinigameLeaderboardEntry[] }>(`/minigames/global-leaderboard/${game}`),
  },

  // ── Missions ─────────────────────────────────────────────────
  missions: {
    list: () => get<MissionsResponse>("/user/missions"),
    claim: (missionId: string) => post<MissionClaimResponse>(`/user/missions/${missionId}/claim`),
  },

  // ── Notifications ────────────────────────────────────────────
  notifications: {
    list: () => get<Notification[]>("/notifications"),
    markRead: (id: string) => patch<void>(`/notifications/${id}/read`),
    markAllRead: () => patch<void>("/notifications/read-all"),
  },

  // ── Avatars ──────────────────────────────────────────────────
  avatars: {
    list: () => get<AvatarsResponse>("/avatars"),
    select: (avatarId: string) => patch<User>("/auth/me", { avatar_id: avatarId }),
  },

  // ── User Stats ───────────────────────────────────────────────
  user: {
    stats: () => get<PredictionStats>("/user/stats"),
  },

  // ── Admin ────────────────────────────────────────────────────
  admin: {
    members: () => get<AdminMember[]>("/admin/members"),
    feedback: () => get<FeedbackItem[]>("/admin/feedback"),
    markFeedbackRead: (id: number) => patch<void>(`/admin/feedback/${id}/read`),
  },
} as const;
