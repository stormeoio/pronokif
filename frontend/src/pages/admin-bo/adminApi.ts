/**
 * Admin Back-Office API helpers.
 * Auth via httpOnly cookie (set by backend on login).
 */
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/admin-bo`,
  withCredentials: true,
});

export const adminApi = {
  // Auth
  sendMagicLink: (email: string) => api.post("/auth/magic-link", { email }),
  verifyMagicLink: (token: string, rememberDevice = false) =>
    api.post("/auth/verify", { token, remember_device: rememberDevice }),
  validate2fa: (code: string, partialToken: string, rememberDevice = false) =>
    api.post(
      "/auth/2fa/validate",
      { code, remember_device: rememberDevice },
      { headers: { Authorization: `Bearer ${partialToken}` } },
    ),
  /** Re-create session from a stored device token (survives cookie loss). */
  refreshSession: (deviceToken: string) => api.post("/auth/refresh", { device_token: deviceToken }),
  setup2fa: () => api.post("/auth/2fa/setup", {}),
  verify2faSetup: (code: string) => api.post("/auth/2fa/verify", { code }),
  me: () => api.get("/auth/me"),
  logout: (deviceToken?: string) =>
    api.post("/auth/logout", deviceToken ? { device_token: deviceToken } : {}),

  // Stats
  stats: () => api.get("/stats").then((r) => r.data),

  // Demo data
  demo: {
    seed: () => api.post("/demo/seed", { confirm: "SEED_DEMO" }).then((r) => r.data),
  },

  // Users
  users: {
    list: (params?: { skip?: number; limit?: number; search?: string }) =>
      api.get("/users", { params }).then((r) => r.data),
    get: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/users/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
  },

  // Championships
  championships: {
    list: () => api.get("/championships").then((r) => r.data),
    create: (data: Record<string, unknown>) => api.post("/championships", data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/championships/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/championships/${id}`).then((r) => r.data),
  },

  // Races
  races: {
    list: (season?: number) =>
      api.get("/races", { params: season ? { season } : {} }).then((r) => r.data),
    seed2026: () => api.post("/races/seed-2026", {}).then((r) => r.data),
    predictionsOverview: (id: string) =>
      api.get(`/races/${id}/predictions-overview`).then((r) => r.data),
    sendReminders: (
      id: string,
      data?: { user_ids?: string[]; send_email?: boolean; send_notification?: boolean },
    ) => api.post(`/races/${id}/reminders`, data ?? {}).then((r) => r.data),
    create: (data: Record<string, unknown>) => api.post("/races", data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/races/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/races/${id}`).then((r) => r.data),
  },

  // Predictions
  predictions: {
    list: (params?: { user_id?: string; race_id?: string; skip?: number; limit?: number }) =>
      api.get("/predictions", { params }).then((r) => r.data),
  },

  // Leagues
  leagues: {
    list: (params?: { skip?: number; limit?: number; search?: string }) =>
      api.get("/leagues", { params }).then((r) => r.data),
  },

  // Feedbacks
  feedbacks: {
    list: (params?: { skip?: number; limit?: number; unread_only?: boolean }) =>
      api.get("/feedbacks", { params }).then((r) => r.data),
    markRead: (id: string) => api.put(`/feedbacks/${id}/read`, {}).then((r) => r.data),
    delete: (id: string) => api.delete(`/feedbacks/${id}`).then((r) => r.data),
  },

  // Invitations
  invitations: {
    list: () => api.get("/invitations").then((r) => r.data),
    send: (data: { email: string; message?: string }) =>
      api.post("/invitations", data).then((r) => r.data),
    sendBatch: (data: { emails: string[]; message?: string }) =>
      api.post("/invitations/batch", data).then((r) => r.data),
  },

  // Media
  media: {
    list: (entityType?: string) =>
      api
        .get("/media", { params: entityType ? { entity_type: entityType } : {} })
        .then((r) => r.data),
    upload: (file: File, entityType?: string, entityId?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (entityType) formData.append("entity_type", entityType);
      if (entityId) formData.append("entity_id", entityId);
      return api
        .post("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    delete: (id: string) => api.delete(`/media/${id}`).then((r) => r.data),
    fileUrl: (id: string) => `${BACKEND_URL}/api/admin-bo/media/${id}/file`,
  },

  // Settings
  settings: {
    get: () => api.get("/settings").then((r) => r.data),
    update: (data: Record<string, unknown>) => api.put("/settings", data).then((r) => r.data),
  },
};
