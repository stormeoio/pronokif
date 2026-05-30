/**
 * Admin Back-Office API helpers.
 * Auth via httpOnly cookie (set by backend on login).
 */
import axios from "axios";
import { resolveBackendUrl } from "@/lib/api";

const BACKEND_URL = resolveBackendUrl();

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
  business: {
    operations: () => api.get("/business/operations").then((r) => r.data),
  },

  // Demo data
  demo: {
    seed: () => api.post("/demo/seed", { confirm: "SEED_DEMO" }).then((r) => r.data),
  },

  // Users
  users: {
    list: (params?: { skip?: number; limit?: number; search?: string }) =>
      api.get("/users", { params }).then((r) => r.data),
    analytics: (params?: { search?: string }) =>
      api.get("/users/analytics", { params }).then((r) => r.data),
    exportCsv: (params?: { search?: string; export_limit?: number }) =>
      api.get("/users/export", { params, responseType: "blob" }).then((r) => r.data),
    get: (id: string) => api.get(`/users/${id}`).then((r) => r.data),
    stats: (id: string) => api.get(`/users/${id}/stats`).then((r) => r.data),
    activity: (id: string, params?: { skip?: number; limit?: number }) =>
      api.get(`/users/${id}/activity`, { params }).then((r) => r.data),
    resendMagicLink: (id: string) => api.post(`/users/${id}/magic-link`, {}).then((r) => r.data),
    inviteToLeague: (
      id: string,
      data: {
        league_id: string;
        message?: string;
        send_email?: boolean;
        send_notification?: boolean;
        add_member?: boolean;
      },
    ) => api.post(`/users/${id}/league-invitation`, data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/users/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
  },

  // Championships
  championships: {
    list: () => api.get("/championships").then((r) => r.data),
    seedF12026: () => api.post("/championships/seed-f1-2026", {}).then((r) => r.data),
    create: (data: Record<string, unknown>) => api.post("/championships", data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/championships/${id}`, data).then((r) => r.data),
    delete: (id: string) => api.delete(`/championships/${id}`).then((r) => r.data),
  },

  // Knowledge / RAG
  knowledge: {
    seedF12026: () => api.post("/knowledge/seed-f1-2026", {}).then((r) => r.data),
    entities: (params?: {
      entity_type?: string;
      q?: string;
      skip?: number;
      limit?: number;
      championship_id?: string;
    }) => api.get("/knowledge/entities", { params }).then((r) => r.data),
    documents: (params?: {
      entity_type?: string;
      q?: string;
      skip?: number;
      limit?: number;
      championship_id?: string;
    }) => api.get("/knowledge/documents", { params }).then((r) => r.data),
    search: (params: {
      q: string;
      entity_type?: string;
      limit?: number;
      mode?: "hybrid" | "lexical" | "vector";
      championship_id?: string;
    }) => api.get("/knowledge/search", { params }).then((r) => r.data),
    updateEntity: (id: string, data: Record<string, unknown>) =>
      api.put(`/knowledge/entities/${encodeURIComponent(id)}`, data).then((r) => r.data),
    claimEntity: (id: string, data?: { owner_admin_email?: string; review_status?: string }) =>
      api
        .post(`/knowledge/entities/${encodeURIComponent(id)}/claim`, data ?? {})
        .then((r) => r.data),
    updateDocument: (id: string, data: Record<string, unknown>) =>
      api.put(`/knowledge/documents/${encodeURIComponent(id)}`, data).then((r) => r.data),
    claimDocument: (id: string, data?: { owner_admin_email?: string; review_status?: string }) =>
      api
        .post(`/knowledge/documents/${encodeURIComponent(id)}/claim`, data ?? {})
        .then((r) => r.data),
    rebuildEmbeddings: (data?: {
      force?: boolean;
      limit?: number;
      entity_type?: string;
      championship_id?: string;
    }) => api.post("/knowledge/embeddings/rebuild", data ?? {}).then((r) => r.data),
    raceContext: (raceId: string, params?: { championship_id?: string }) =>
      api.get(`/knowledge/races/${raceId}/context`, { params }).then((r) => r.data),
    predictionBrief: (raceId: string, params?: { championship_id?: string }) =>
      api.get(`/knowledge/races/${raceId}/prediction-brief`, { params }).then((r) => r.data),
    teamContext: (teamId: string, params?: { championship_id?: string }) =>
      api.get(`/knowledge/teams/${teamId}/context`, { params }).then((r) => r.data),
    teamBrief: (teamId: string, params?: { championship_id?: string }) =>
      api.get(`/knowledge/teams/${teamId}/brief`, { params }).then((r) => r.data),
    driverContext: (driverId: string, params?: { championship_id?: string }) =>
      api.get(`/knowledge/drivers/${driverId}/context`, { params }).then((r) => r.data),
    driverBrief: (driverId: string, params?: { championship_id?: string }) =>
      api.get(`/knowledge/drivers/${driverId}/brief`, { params }).then((r) => r.data),
  },

  // Circuit maps
  circuitMaps: {
    list: (params?: {
      q?: string;
      review_status?: string;
      priority?: string;
      owner?: string;
      source?: string;
      skip?: number;
      limit?: number;
    }) => api.get("/circuit-maps", { params }).then((r) => r.data),
    update: (key: string, data: Record<string, unknown>) =>
      api.put(`/circuit-maps/${encodeURIComponent(key)}`, data).then((r) => r.data),
    reset: (key: string) =>
      api.delete(`/circuit-maps/${encodeURIComponent(key)}`).then((r) => r.data),
  },

  // Legal / PWA publishing
  legal: {
    seedDefaults: () => api.post("/legal-pages/seed-defaults", {}).then((r) => r.data),
    list: (params?: { locale?: string }) => api.get("/legal-pages", { params }).then((r) => r.data),
    update: (slug: string, data: Record<string, unknown>) =>
      api.put(`/legal-pages/${encodeURIComponent(slug)}`, data).then((r) => r.data),
  },

  // Translation registry
  translations: {
    registry: (params?: {
      source?: string;
      q?: string;
      locale?: "fr" | "en";
      missing_only?: boolean;
      limit?: number;
    }) => api.get("/translations/registry", { params }).then((r) => r.data),
    update: (
      source: string,
      documentId: string,
      data: { field: string; locale: "fr" | "en"; value: string },
    ) =>
      api
        .put(
          `/translations/registry/${encodeURIComponent(source)}/${encodeURIComponent(documentId)}`,
          data,
        )
        .then((r) => r.data),
  },

  // Races
  races: {
    list: (params?: { season?: number; championship_id?: string }) =>
      api.get("/races", { params }).then((r) => r.data),
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
    list: (params?: {
      user_id?: string;
      race_id?: string;
      championship_id?: string;
      q?: string;
      status?: string;
      review_status?: string;
      locked?: boolean;
      skip?: number;
      limit?: number;
    }) => api.get("/predictions", { params }).then((r) => r.data),
    analytics: (params?: {
      user_id?: string;
      race_id?: string;
      championship_id?: string;
      q?: string;
      status?: string;
      review_status?: string;
      locked?: boolean;
    }) => api.get("/predictions/analytics", { params }).then((r) => r.data),
    exportCsv: (params?: {
      user_id?: string;
      race_id?: string;
      championship_id?: string;
      q?: string;
      status?: string;
      review_status?: string;
      locked?: boolean;
      export_limit?: number;
    }) => api.get("/predictions/export", { params, responseType: "blob" }).then((r) => r.data),
    get: (id: string) => api.get(`/predictions/${id}`).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/predictions/${id}`, data).then((r) => r.data),
    lock: (id: string, data: { locked: boolean; reason?: string }) =>
      api.post(`/predictions/${id}/lock`, data).then((r) => r.data),
    batch: (data: {
      ids: string[];
      action: "lock" | "unlock" | "delete" | "set_review_status";
      review_status?: string;
      reason?: string;
    }) => api.post("/predictions/batch", data).then((r) => r.data),
    delete: (id: string) => api.delete(`/predictions/${id}`).then((r) => r.data),
  },

  // Scoring / reconciliation
  scoring: {
    reconciliation: (params?: { championship_id?: string; limit?: number }) =>
      api.get("/scoring/reconciliation", { params }).then((r) => r.data),
    ledger: (params?: {
      score_type?: "all" | "official_race" | "custom_prediction";
      championship_id?: string;
      user_id?: string;
      race_id?: string;
      league_id?: string;
      q?: string;
      skip?: number;
      limit?: number;
    }) => api.get("/scoring/ledger", { params }).then((r) => r.data),
    ledgerExportCsv: (params?: {
      score_type?: "all" | "official_race" | "custom_prediction";
      championship_id?: string;
      user_id?: string;
      race_id?: string;
      league_id?: string;
      q?: string;
      export_limit?: number;
    }) => api.get("/scoring/ledger/export", { params, responseType: "blob" }).then((r) => r.data),
    applyReconciliation: (data: {
      championship_id?: string;
      confirm: "RECONCILE_SCORES";
      limit?: number;
    }) => api.post("/scoring/reconciliation/apply", data).then((r) => r.data),
    rescoreRace: (raceId: string) =>
      api
        .post(`/races/${encodeURIComponent(raceId)}/rescore`, { confirm: "RESCORE_RACE" })
        .then((r) => r.data),
  },

  // Activity logs
  activityLogs: {
    list: (params?: {
      actor_email?: string;
      entity_type?: string;
      entity_id?: string;
      action?: string;
      q?: string;
      skip?: number;
      limit?: number;
    }) => api.get("/activity-logs", { params }).then((r) => r.data),
    exportCsv: (params?: {
      actor_email?: string;
      entity_type?: string;
      entity_id?: string;
      action?: string;
      q?: string;
      export_limit?: number;
    }) => api.get("/activity-logs/export", { params, responseType: "blob" }).then((r) => r.data),
  },

  // Leagues
  leagues: {
    list: (params?: { skip?: number; limit?: number; search?: string }) =>
      api.get("/leagues", { params }).then((r) => r.data),
    analytics: (params?: { search?: string }) =>
      api.get("/leagues/analytics", { params }).then((r) => r.data),
    exportCsv: (params?: { search?: string; export_limit?: number }) =>
      api.get("/leagues/export", { params, responseType: "blob" }).then((r) => r.data),
    get: (id: string) => api.get(`/leagues/${id}`).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/leagues/${id}`, data).then((r) => r.data),
    addMember: (id: string, userId: string) =>
      api.post(`/leagues/${id}/members/add`, { user_id: userId }).then((r) => r.data),
    removeMember: (id: string, userId: string) =>
      api.post(`/leagues/${id}/members/remove`, { user_id: userId }).then((r) => r.data),
    transferOwner: (id: string, newOwnerId: string) =>
      api.post(`/leagues/${id}/transfer-owner`, { new_owner_id: newOwnerId }).then((r) => r.data),
    delete: (id: string) => api.delete(`/leagues/${id}`).then((r) => r.data),
  },

  // Feedbacks
  feedbacks: {
    list: (params?: {
      skip?: number;
      limit?: number;
      unread_only?: boolean;
      q?: string;
      category?: string;
      read_status?: string;
      status?: string;
      priority?: string;
      owner?: string;
    }) => api.get("/feedbacks", { params }).then((r) => r.data),
    analytics: (params?: {
      q?: string;
      category?: string;
      read_status?: string;
      status?: string;
      priority?: string;
      owner?: string;
    }) => api.get("/feedbacks/analytics", { params }).then((r) => r.data),
    exportCsv: (params?: {
      q?: string;
      category?: string;
      read_status?: string;
      status?: string;
      priority?: string;
      owner?: string;
      export_limit?: number;
    }) => api.get("/feedbacks/export", { params, responseType: "blob" }).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/feedbacks/${id}`, data).then((r) => r.data),
    reply: (id: string, data: { reply: string; status?: string; mark_read?: boolean }) =>
      api.post(`/feedbacks/${id}/reply`, data).then((r) => r.data),
    markRead: (id: string) => api.put(`/feedbacks/${id}/read`, {}).then((r) => r.data),
    markUnread: (id: string) => api.put(`/feedbacks/${id}/unread`, {}).then((r) => r.data),
    batch: (data: {
      ids: string[];
      action: "mark_read" | "mark_unread" | "delete" | "set_status" | "set_priority" | "assign";
      status?: string;
      priority?: string;
      assigned_to?: string;
    }) => api.post("/feedbacks/batch", data).then((r) => r.data),
    delete: (id: string) => api.delete(`/feedbacks/${id}`).then((r) => r.data),
  },

  // Invitations
  invitations: {
    list: (params?: {
      search?: string;
      status?: string;
      sent_by?: string;
      skip?: number;
      limit?: number;
    }) => api.get("/invitations", { params }).then((r) => r.data),
    analytics: (params?: { search?: string; status?: string; sent_by?: string }) =>
      api.get("/invitations/analytics", { params }).then((r) => r.data),
    exportCsv: (params?: {
      search?: string;
      status?: string;
      sent_by?: string;
      export_limit?: number;
    }) => api.get("/invitations/export", { params, responseType: "blob" }).then((r) => r.data),
    send: (data: { email: string; message?: string }) =>
      api.post("/invitations", data).then((r) => r.data),
    sendBatch: (data: { emails: string[]; message?: string }) =>
      api.post("/invitations/batch", data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      api.put(`/invitations/${id}`, data).then((r) => r.data),
    resend: (id: string, data?: { message?: string }) =>
      api.post(`/invitations/${id}/resend`, data ?? {}).then((r) => r.data),
    revoke: (id: string) => api.post(`/invitations/${id}/revoke`, {}).then((r) => r.data),
    delete: (id: string) => api.delete(`/invitations/${id}`).then((r) => r.data),
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
