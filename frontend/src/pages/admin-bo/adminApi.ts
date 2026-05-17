/**
 * Admin Back-Office API helpers.
 * Uses separate admin token (not user token).
 */
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const BASE = `${BACKEND_URL}/api/admin-bo`;

function getToken(): string {
  return localStorage.getItem("admin_token") || "";
}

function headers() {
  return { Authorization: `Bearer ${getToken()}` };
}

export const adminApi = {
  // Auth
  sendMagicLink: (email: string) => axios.post(`${BASE}/auth/magic-link`, { email }),
  verifyMagicLink: (token: string) => axios.post(`${BASE}/auth/verify`, { token }),
  validate2fa: (code: string, partialToken: string) =>
    axios.post(
      `${BASE}/auth/2fa/validate`,
      { code },
      { headers: { Authorization: `Bearer ${partialToken}` } },
    ),
  setup2fa: () => axios.post(`${BASE}/auth/2fa/setup`, {}, { headers: headers() }),
  verify2faSetup: (code: string) =>
    axios.post(`${BASE}/auth/2fa/verify`, { code }, { headers: headers() }),
  me: () => axios.get(`${BASE}/auth/me`, { headers: headers() }),

  // Stats
  stats: () => axios.get(`${BASE}/stats`, { headers: headers() }).then((r) => r.data),

  // Users
  users: {
    list: (params?: { skip?: number; limit?: number; search?: string }) =>
      axios.get(`${BASE}/users`, { headers: headers(), params }).then((r) => r.data),
    get: (id: string) =>
      axios.get(`${BASE}/users/${id}`, { headers: headers() }).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      axios.put(`${BASE}/users/${id}`, data, { headers: headers() }).then((r) => r.data),
    delete: (id: string) =>
      axios.delete(`${BASE}/users/${id}`, { headers: headers() }).then((r) => r.data),
  },

  // Championships
  championships: {
    list: () => axios.get(`${BASE}/championships`, { headers: headers() }).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      axios.post(`${BASE}/championships`, data, { headers: headers() }).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      axios.put(`${BASE}/championships/${id}`, data, { headers: headers() }).then((r) => r.data),
    delete: (id: string) =>
      axios.delete(`${BASE}/championships/${id}`, { headers: headers() }).then((r) => r.data),
  },

  // Races
  races: {
    list: (season?: number) =>
      axios
        .get(`${BASE}/races`, { headers: headers(), params: season ? { season } : {} })
        .then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      axios.post(`${BASE}/races`, data, { headers: headers() }).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      axios.put(`${BASE}/races/${id}`, data, { headers: headers() }).then((r) => r.data),
    delete: (id: string) =>
      axios.delete(`${BASE}/races/${id}`, { headers: headers() }).then((r) => r.data),
  },

  // Predictions
  predictions: {
    list: (params?: { user_id?: string; race_id?: string; skip?: number; limit?: number }) =>
      axios.get(`${BASE}/predictions`, { headers: headers(), params }).then((r) => r.data),
  },

  // Feedbacks
  feedbacks: {
    list: (params?: { skip?: number; limit?: number; unread_only?: boolean }) =>
      axios.get(`${BASE}/feedbacks`, { headers: headers(), params }).then((r) => r.data),
    markRead: (id: string) =>
      axios.put(`${BASE}/feedbacks/${id}/read`, {}, { headers: headers() }).then((r) => r.data),
    delete: (id: string) =>
      axios.delete(`${BASE}/feedbacks/${id}`, { headers: headers() }).then((r) => r.data),
  },

  // Invitations
  invitations: {
    list: () => axios.get(`${BASE}/invitations`, { headers: headers() }).then((r) => r.data),
    send: (data: { email: string; message?: string }) =>
      axios.post(`${BASE}/invitations`, data, { headers: headers() }).then((r) => r.data),
  },

  // Media
  media: {
    list: (entityType?: string) =>
      axios
        .get(`${BASE}/media`, {
          headers: headers(),
          params: entityType ? { entity_type: entityType } : {},
        })
        .then((r) => r.data),
    upload: (file: File, entityType?: string, entityId?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (entityType) formData.append("entity_type", entityType);
      if (entityId) formData.append("entity_id", entityId);
      return axios
        .post(`${BASE}/media/upload`, formData, {
          headers: { ...headers(), "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    delete: (id: string) =>
      axios.delete(`${BASE}/media/${id}`, { headers: headers() }).then((r) => r.data),
    fileUrl: (id: string) => `${BASE}/media/${id}/file`,
  },

  // Settings
  settings: {
    get: () => axios.get(`${BASE}/settings`, { headers: headers() }).then((r) => r.data),
    update: (data: Record<string, unknown>) =>
      axios.put(`${BASE}/settings`, data, { headers: headers() }).then((r) => r.data),
  },
};
