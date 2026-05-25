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
  CreateCustomPredictionPayload,
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

/**
 * Pre-configured axios instance.
 * Auth via httpOnly cookies (withCredentials) — no localStorage tokens.
 * Auto-refresh on 401 via /auth/refresh before redirecting to login.
 */
export const apiClient = axios.create({
  baseURL: API,
  withCredentials: true, // send httpOnly cookies on every request
});

const REFRESH_EXCLUDED_PATHS = [
  "/auth/me",
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/magic-link",
  "/auth/forgot-password",
  "/auth/reset-password",
];

function shouldAttemptRefresh(url?: string): boolean {
  return !!url && !REFRESH_EXCLUDED_PATHS.some((path) => url.includes(path));
}

// Track refresh state to avoid concurrent refresh calls
let isRefreshing = false;
let refreshSubscribers: ((ok: boolean) => void)[] = [];

function onRefreshDone(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying and not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      shouldAttemptRefresh(originalRequest.url)
    ) {
      if (isRefreshing) {
        // Wait for the ongoing refresh to finish, then retry
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((ok: boolean) => {
            if (ok) {
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await apiClient.post("/auth/refresh");
        isRefreshing = false;
        onRefreshDone(true);
        // Retry the original request (cookie is now fresh)
        return apiClient(originalRequest);
      } catch {
        isRefreshing = false;
        onRefreshDone(false);
        localStorage.removeItem("user");
        if (window.location.pathname !== "/auth") {
          window.location.href = "/auth";
        }
        return Promise.reject(error);
      }
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

// ═══════════════════════════════════════ ERROR HELPERS ═══════════════════════

/** Extract error message from axios error responses. */
export function getApiError(e: unknown, fallback = "Erreur"): string {
  const err = e as { response?: { data?: { detail?: string }; status?: number } };
  return err.response?.data?.detail || fallback;
}

/** Extract HTTP status from axios error. */
export function getApiStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } }).response?.status;
}

// ═══════════════════════════════════════ TYPED API OBJECT ═════════════════════

export const api = {
  // ── Auth ─────────────────────────────────────────────────────
  auth: {
    login: (body: { email: string; password: string }) => post<TokenResponse>("/auth/login", body),
    register: (body: { email: string; password: string; username: string }) =>
      post<TokenResponse>("/auth/register", body),
    me: () => get<User>("/auth/me"),
    setUsername: (body: { username: string }) => post<User>("/auth/username", body),
    updateProfile: (body: Partial<User>) => patch<User>("/auth/me", body),
  },

  // ── Races ────────────────────────────────────────────────────
  races: {
    list: () => get<Race[]>("/races"),
    upcoming: () => get<Race[]>("/races/upcoming"),
    next: () => get<Race>("/races/next"),
    get: (id: string) => get<RaceDetails>(`/races/${id}`),
    details: (id: string) => get<RaceDetails>(`/races/${id}/details`),
    results: (raceId: string) => get<ResultsResponse>(`/races/${raceId}/results`),
    predictionCount: (raceId: string) =>
      get<{ count: number }>(`/races/${raceId}/prediction-count`),
  },

  // ── Drivers ──────────────────────────────────────────────────
  drivers: {
    list: () => get<Driver[]>("/drivers"),
    all: () => get<Driver[]>("/drivers/all"),
    get: (id: string) => get<DriverDetails>(`/drivers/${id}`),
    details: (id: string) => get<DriverDetails>(`/drivers/${id}/details`),
    compare: (id1: string, id2: string) =>
      get<DriverComparison>(`/drivers/compare?driver1=${id1}&driver2=${id2}`),
  },

  // ── Leagues ──────────────────────────────────────────────────
  leagues: {
    my: () => get<League[]>("/leagues/my"),
    get: (id: string) => get<League>(`/leagues/${id}`),
    byCode: (code: string) => get<LeaguePreview>(`/leagues/by-code/${code}`),
    create: (body: { name: string }) => post<League>("/leagues", body),
    join: (body: { code: string }) => post<League>("/leagues/join", body),
    select: (id: string) => post<void>(`/leagues/${id}/select`),
    leave: (id: string) => post<void>(`/leagues/${id}/leave`),
    delete: (id: string) => del<void>(`/leagues/${id}`),
    update: (id: string, body: { name?: string; description?: string }) =>
      put<League>(`/leagues/${id}`, body),
    transfer: (id: string, body: { new_owner_id: string }) =>
      post<void>(`/leagues/${id}/transfer`, body),
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
    get: (raceId: string) => get<Prediction>(`/predictions/race/${raceId}`),
    saveSprint: (body: unknown) => post<Prediction>("/predictions/sprint", body),
    saveMain: (body: unknown) => post<Prediction>("/predictions/main", body),
    delete: (raceId: string) => del<void>(`/predictions/race/${raceId}`),
    stats: () => get<PredictionStats>("/predictions/stats"),
    history: () => get<PointsHistoryEntry[]>("/predictions/history"),
    pointsHistory: () => get<PointsHistoryEntry[]>("/predictions/points-history"),
  },

  // ── Custom Predictions ───────────────────────────────────────
  customPredictions: {
    list: (leagueId: string, raceId: string) =>
      get<CustomPrediction[]>(`/predictions/custom/league/${leagueId}/race/${raceId}`),
    create: (body: CreateCustomPredictionPayload) =>
      post<CustomPrediction>("/predictions/custom", body),
    answer: (predictionId: string, answer: unknown) =>
      post<void>(`/custom-predictions/${predictionId}/answer`, { answer }),
    setCorrect: (predictionId: string, body: unknown) =>
      post<void>(`/custom-predictions/${predictionId}/set-correct`, body),
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
    unreadCount: () => get<{ count: number }>("/notifications/unread-count"),
    markRead: (id: string) => put<void>(`/notifications/${id}/read`),
    markAllRead: () => put<void>("/notifications/read-all"),
  },

  // ── Avatars ──────────────────────────────────────────────────
  avatars: {
    list: () => get<AvatarsResponse>("/avatars"),
    select: (avatarId: string) => post<User>("/user/avatar", { avatar_id: avatarId }),
    upload: (formData: FormData) => post<{ avatar_url: string }>("/user/avatar/upload", formData),
  },

  // ── User Stats ───────────────────────────────────────────────
  user: {
    stats: () => get<PredictionStats>("/user/stats"),
    streak: () => get<unknown>("/user/streak"),
  },

  // ── Admin ────────────────────────────────────────────────────
  admin: {
    members: () => get<AdminMember[]>("/admin/members"),
    member: (id: string) => get<AdminMember>(`/admin/members/${id}`),
    memberActivity: (id: string) => get<unknown[]>(`/admin/members/${id}/activity`),
    deleteMember: (id: string) => del<void>(`/admin/members/${id}`),
    races: () => get<Race[]>("/admin/races"),
    results: (raceId: string) => get<unknown>(`/admin/results/${raceId}`),
    saveResults: (raceId: string, body: unknown) => post<void>(`/admin/results/${raceId}`, body),
    syncResults: (raceId: string) => post<void>(`/admin/sync-results/${raceId}`),
    sendNotification: (body: { title: string; message: string; type: string }) =>
      post<void>("/admin/notifications", body),
    feedback: () => get<FeedbackItem[]>("/admin/feedback"),
    markFeedbackRead: (id: number) => put<void>(`/admin/feedback/${id}/read`),
  },

  // ── Feedback ────────────────────────────────────────────────
  feedback: {
    send: (body: { type: string; message: string }) => post<void>("/feedback", body),
  },

  // ── Profile ─────────────────────────────────────────────────
  profile: {
    get: (userId: string) => get<unknown>(`/users/${userId}/profile`),
  },

  // ── Results ─────────────────────────────────────────────────
  results: {
    get: (raceId: string) => get<ResultsResponse>(`/results/${raceId}`),
    latestUnseen: () => get<unknown>("/results/latest-unseen"),
  },
} as const;
