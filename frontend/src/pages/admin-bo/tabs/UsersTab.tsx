/**
 * Admin Users management tab.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Search,
  Trash2,
  Download,
  Edit2,
  Eye,
  Ban,
  Bell,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MailPlus,
  MessageCircle,
  Send,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { DateEntityToken, RaceEntityToken } from "@/components/entities/RaceEntityToken";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserIdentity } from "@/components/users/UserIdentity";

const EMAIL_SPLIT_PATTERN = /[\s,;]+/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseInviteEmails(input: string) {
  const entries = input
    .split(EMAIL_SPLIT_PATTERN)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const unique = Array.from(new Set(entries));

  return {
    valid: unique.filter((email) => EMAIL_PATTERN.test(email)),
    invalid: unique.filter((email) => !EMAIL_PATTERN.test(email)),
  };
}

function formatDateTime(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserStatTile({
  icon: Icon,
  label,
  value,
  tone = "text-white",
}: {
  icon: typeof BarChart3;
  label: string;
  value: unknown;
  tone?: string;
}) {
  return (
    <div className="card-arcade border-l-4 border-pk-red p-3">
      <Icon className="mb-2 h-4 w-4 text-pk-red" />
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-1 font-data text-xl ${tone}`}>{String(value ?? 0)}</p>
    </div>
  );
}

type UserAnalyticsRow = {
  user_id: string;
  email?: string;
  username?: string;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  created_at?: string;
  predictions_count: number;
  complete_predictions: number;
  total_points: number;
  average_points: number;
  leagues_count: number;
  last_prediction_at?: string;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function userIdentityFromRecord(user: Record<string, unknown>, fallbackId?: string | null) {
  return {
    id: String(user.id ?? user.user_id ?? fallbackId ?? ""),
    user_id: String(user.user_id ?? user.id ?? fallbackId ?? ""),
    username: (user.username ?? user.user_username ?? null) as string | null,
    user_username: (user.user_username ?? user.username ?? null) as string | null,
    email: (user.email ?? user.user_email ?? null) as string | null,
    user_email: (user.user_email ?? user.email ?? null) as string | null,
    avatar_id: (user.avatar_id ?? null) as string | null,
    custom_avatar_url: (user.custom_avatar_url ?? null) as string | null,
    level: (user.level ?? null) as number | null,
  };
}

export default function UsersTab() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [leagueInvite, setLeagueInvite] = useState({
    league_id: "",
    message: "",
    send_email: true,
    send_notification: true,
    add_member: false,
  });
  const limit = 20;

  const inviteEmails = useMemo(() => parseInviteEmails(inviteInput), [inviteInput]);

  useEffect(() => {
    const userId = searchParams.get("user");
    if (userId && userId !== selectedUserId) {
      setSelectedUserId(userId);
    }
  }, [searchParams, selectedUserId]);

  const selectUser = (userId: string | null) => {
    setSelectedUserId(userId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "users");
    if (userId) {
      nextParams.set("user", userId);
    } else {
      nextParams.delete("user");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "users", search, page],
    queryFn: () => adminApi.users.list({ search, skip: page * limit, limit }),
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-bo", "users", "analytics", search],
    queryFn: () => adminApi.users.analytics({ search }),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const selectedUserStats = useQuery({
    queryKey: ["admin-bo", "users", selectedUserId, "stats"],
    queryFn: () => adminApi.users.stats(String(selectedUserId)),
    enabled: !!selectedUserId,
  });

  const leagueOptionsQuery = useQuery({
    queryKey: ["admin-bo", "leagues", "user-invite-options"],
    queryFn: () => adminApi.leagues.list({ limit: 100 }),
  });

  const batchInviteMutation = useMutation({
    mutationFn: () =>
      adminApi.invitations.sendBatch({
        emails: inviteEmails.valid,
        message: inviteMessage.trim() || undefined,
      }),
    onSuccess: (result) => {
      const sent = result.sent ?? result.created?.length ?? 0;
      const skipped = result.skipped?.length ?? 0;
      const failed = result.failed?.length ?? 0;

      if (sent > 0) {
        toast.success(`${sent} invitation${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}`);
        setInviteInput("");
        setInviteMessage("");
      }

      if (skipped > 0 || failed > 0) {
        toast.warning(
          `${skipped} ignorée${skipped > 1 ? "s" : ""}, ${failed} échouée${failed > 1 ? "s" : ""}`,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["admin-bo", "invitations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Impossible d'envoyer les invitations");
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => adminApi.users.exportCsv({ search, export_limit: 5000 }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-users.csv");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const resendMagicLinkMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId) throw new Error("User id missing");
      return adminApi.users.resendMagicLink(selectedUserId);
    },
    onSuccess: (result) => {
      toast.success(
        result.email_sent
          ? "Lien magique envoyé au joueur"
          : "Lien magique généré, email non confirmé",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users", selectedUserId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Impossible de renvoyer le lien magique");
    },
  });

  const leagueInviteMutation = useMutation({
    mutationFn: () => {
      if (!selectedUserId) throw new Error("User id missing");
      return adminApi.users.inviteToLeague(selectedUserId, {
        league_id: leagueInvite.league_id,
        message: leagueInvite.message.trim() || undefined,
        send_email: leagueInvite.send_email,
        send_notification: leagueInvite.send_notification,
        add_member: leagueInvite.add_member,
      });
    },
    onSuccess: (result) => {
      if (result.member_added) {
        toast.success("Joueur ajouté à la ligue");
      } else if (result.email_sent || result.notification_sent) {
        toast.success("Invitation ligue envoyée");
      } else {
        toast.warning("Invitation préparée, aucun canal confirmé");
      }
      setLeagueInvite((prev) => ({ ...prev, message: "" }));
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users", selectedUserId, "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "leagues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Impossible d'envoyer l'invitation ligue");
    },
  });

  const handleBatchInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteEmails.invalid.length > 0) {
      toast.error(`${inviteEmails.invalid.length} adresse(s) email invalide(s)`);
      return;
    }
    if (inviteEmails.valid.length === 0) {
      toast.error("Ajoutez au moins une adresse email");
      return;
    }
    batchInviteMutation.mutate();
  };

  const handleLeagueInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueInvite.league_id) {
      toast.error("Sélectionnez une ligue");
      return;
    }
    if (!leagueInvite.send_email && !leagueInvite.send_notification && !leagueInvite.add_member) {
      toast.error("Choisissez au moins un canal ou l'ajout direct");
      return;
    }
    leagueInviteMutation.mutate();
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" et toutes ses données ?`)) return;
    try {
      await adminApi.users.delete(userId);
      toast.success("Utilisateur supprimé");
      if (selectedUserId === userId) setSelectedUserId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    try {
      await adminApi.users.update(userId, { is_banned: !currentlyBanned });
      toast.success(currentlyBanned ? "Utilisateur débanni" : "Utilisateur banni");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await adminApi.users.update(editingUser.id as string, {
        username: editingUser.username,
        email: editingUser.email,
      });
      toast.success("Utilisateur mis à jour");
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      if (selectedUserId === editingUser.id) {
        queryClient.invalidateQueries({ queryKey: ["admin-bo", "users", selectedUserId, "stats"] });
      }
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const selectedStats = selectedUserStats.data?.stats ?? {};
  const selectedUser =
    selectedUserStats.data?.user ??
    users.find((user: Record<string, unknown>) => user.id === selectedUserId);
  const analyticsSummary = analytics?.summary ?? {};
  const leagueOptions = leagueOptionsQuery.data?.leagues ?? [];
  const selectedIdentity = userIdentityFromRecord(
    (selectedUser ?? {}) as Record<string, unknown>,
    selectedUserId,
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-white uppercase tracking-tight">
            Utilisateurs
          </h2>
          <p className="font-body text-xs text-gray-500">
            Cohortes, stats de participation et gestion des comptes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="text-xs text-gray-300 hover:text-white"
          >
            {exportMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Export CSV
          </Button>
          <span className="font-data text-sm text-gray-500">{total} au total</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <UserStatTile
          icon={BarChart3}
          label="Filtrés"
          value={analyticsSummary.users_count ?? total}
        />
        <UserStatTile
          icon={BarChart3}
          label="Avec pronos"
          value={analyticsSummary.users_with_predictions}
          tone="text-emerald-400"
        />
        <UserStatTile
          icon={BarChart3}
          label="Sans prono"
          value={analyticsSummary.users_without_predictions}
          tone="text-amber-400"
        />
        <UserStatTile
          icon={Trophy}
          label="Points"
          value={analyticsSummary.total_points}
          tone="text-orange-400"
        />
        <UserStatTile
          icon={Activity}
          label="Moy. pronos"
          value={analyticsSummary.average_predictions_per_user}
          tone="text-cyan-400"
        />
        <UserStatTile
          icon={Ban}
          label="Bannis"
          value={analyticsSummary.banned_users}
          tone="text-red-300"
        />
      </div>

      {/* Batch invitations */}
      <form onSubmit={handleBatchInvite} className="card-arcade mb-4 border border-cyan-500/25 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm uppercase text-cyan-400">Inviter des testeurs</h3>
            <p className="font-body text-xs text-gray-500">
              Collez plusieurs adresses séparées par une virgule, un espace ou un retour à la ligne.
            </p>
          </div>
          <span className="font-data text-xs text-gray-500">
            {inviteEmails.valid.length} valide{inviteEmails.valid.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <Textarea
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="driver.com, paddock.com"
            rows={3}
            className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
          />
          <div className="grid gap-3">
            <Textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Message optionnel"
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Button
              type="submit"
              disabled={inviteEmails.valid.length === 0 || batchInviteMutation.isPending}
              size="sm"
              className="btn-racing text-xs"
            >
              {batchInviteMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="mr-1 h-4 w-4" />
              )}
              Envoyer les invitations
            </Button>
          </div>
        </div>
        {inviteEmails.invalid.length > 0 && (
          <p className="mt-2 font-body text-xs text-red-400">
            Adresses invalides : {inviteEmails.invalid.slice(0, 4).join(", ")}
            {inviteEmails.invalid.length > 4 ? "..." : ""}
          </p>
        )}
      </form>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Rechercher par nom ou email..."
          className="pl-10 bg-gray-900 border-gray-700 text-white"
        />
      </div>

      {!!analytics && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <section className="card-arcade p-4">
            <h3 className="mb-3 font-heading text-xs uppercase text-white">Top joueurs</h3>
            <div className="space-y-2">
              {((analytics.top_users ?? []) as UserAnalyticsRow[]).slice(0, 5).map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <UserIdentity
                      user={user}
                      surface="admin"
                      size="sm"
                      showEmail
                      className="max-w-full"
                      data-testid={`admin-top-user-${user.user_id}`}
                    />
                    <p className="font-body text-[11px] text-gray-500">
                      {user.complete_predictions}/{user.predictions_count} complets ·{" "}
                      {user.leagues_count} ligue{user.leagues_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-data text-xs text-orange-400">
                    {user.total_points} pts
                  </span>
                </div>
              ))}
              {(analytics.top_users ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">Aucun joueur scoré.</p>
              )}
            </div>
          </section>

          <section className="card-arcade p-4">
            <h3 className="mb-3 font-heading text-xs uppercase text-white">
              Utilisateurs sans pronostic
            </h3>
            <div className="space-y-2">
              {((analytics.inactive_users ?? []) as UserAnalyticsRow[]).slice(0, 5).map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <UserIdentity
                      user={user}
                      surface="admin"
                      size="sm"
                      showEmail
                      className="max-w-full"
                      data-testid={`admin-inactive-user-${user.user_id}`}
                    />
                    <p className="font-body text-[11px] text-gray-500">
                      Inscrit le {formatDateTime(user.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 font-data text-xs text-amber-300">0 prono</span>
                </div>
              ))}
              {(analytics.inactive_users ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">
                  Tous les utilisateurs filtrés ont au moins un pronostic.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="card-arcade p-4 mb-4 border border-orange-500/30">
          <h3 className="font-heading text-sm text-orange-400 uppercase mb-3">
            Modifier l'utilisateur
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              value={(editingUser.username as string) || ""}
              onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
              placeholder="Pseudo"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={(editingUser.email as string) || ""}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              placeholder="Email"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit} className="btn-racing text-xs">
              Enregistrer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingUser(null)}
              className="text-gray-400 text-xs"
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      {selectedUserId && (
        <section className="card-arcade mb-4 border border-cyan-500/25 p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="mb-2 font-heading text-sm uppercase text-cyan-400">Fiche joueur</h3>
              <UserIdentity
                user={selectedIdentity}
                surface="admin"
                size="md"
                showEmail
                showLevel
                linked={false}
                className="max-w-full"
                data-testid="admin-selected-user-identity"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => resendMagicLinkMutation.mutate()}
                disabled={resendMagicLinkMutation.isPending}
                className="text-xs text-emerald-300"
                data-testid="admin-user-resend-magic-link"
              >
                {resendMagicLinkMutation.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <MailPlus className="mr-1 h-4 w-4" />
                )}
                Lien magique
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => selectUser(null)}
                className="text-xs text-gray-400"
              >
                Fermer
              </Button>
            </div>
          </div>

          {selectedUserStats.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <UserStatTile
                  icon={BarChart3}
                  label="Pronos"
                  value={selectedStats.predictions_count}
                />
                <UserStatTile
                  icon={BarChart3}
                  label="Complets"
                  value={selectedStats.complete_predictions}
                  tone="text-emerald-400"
                />
                <UserStatTile
                  icon={Trophy}
                  label="Points"
                  value={selectedStats.total_points}
                  tone="text-orange-400"
                />
                <UserStatTile
                  icon={Trophy}
                  label="Moyenne"
                  value={selectedStats.average_points}
                  tone="text-cyan-400"
                />
                <UserStatTile
                  icon={Activity}
                  label="Ligues"
                  value={selectedStats.leagues_count}
                  tone="text-purple-300"
                />
                <UserStatTile
                  icon={Activity}
                  label="Logs"
                  value={(selectedStats.recent_activity ?? []).length}
                  tone="text-red-300"
                />
              </div>

              <form
                onSubmit={handleLeagueInvite}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-3"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-heading text-xs uppercase text-emerald-300">
                      Invitation ligue manuelle
                    </h4>
                    <p className="font-body text-[11px] text-gray-500">
                      Envoie un code de ligue, une notification, ou ajoute directement le joueur.
                    </p>
                  </div>
                  <Send className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
                  <select
                    value={leagueInvite.league_id}
                    onChange={(event) =>
                      setLeagueInvite((prev) => ({ ...prev, league_id: event.target.value }))
                    }
                    className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
                    data-testid="admin-user-league-invite-select"
                  >
                    <option value="">Choisir une ligue</option>
                    {leagueOptions.map((league: Record<string, unknown>) => (
                      <option key={String(league.id)} value={String(league.id)}>
                        {String(league.name ?? league.code ?? league.id)}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={leagueInvite.message}
                    onChange={(event) =>
                      setLeagueInvite((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="Message optionnel"
                    className="border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                    data-testid="admin-user-league-invite-message"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!leagueInvite.league_id || leagueInviteMutation.isPending}
                    className="btn-racing text-xs"
                    data-testid="admin-user-league-invite-submit"
                  >
                    {leagueInviteMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Envoyer
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 font-body text-xs text-gray-400">
                  {[
                    ["send_email", "Email"],
                    ["send_notification", "Notification"],
                    ["add_member", "Ajouter directement"],
                  ].map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(leagueInvite[key as keyof typeof leagueInvite])}
                        onChange={(event) =>
                          setLeagueInvite((prev) => ({
                            ...prev,
                            [key]: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-white/20 bg-gray-900 text-pk-red focus:ring-pk-red/40"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </form>

              {selectedStats.best_race && (
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    Meilleur Grand Prix
                  </p>
                  <p className="mt-1 font-body text-sm text-white leading-7">
                    <RaceEntityToken
                      raceId={selectedStats.best_race.race_id}
                      raceName={selectedStats.best_race.race_name}
                      href={
                        selectedStats.best_race.race_id
                          ? `/results/${selectedStats.best_race.race_id}`
                          : undefined
                      }
                    />{" "}
                    ·{" "}
                    <span className="font-data text-orange-400">
                      {selectedStats.best_race.points} pts
                    </span>
                  </p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="mb-3 font-heading text-xs uppercase text-white">
                    Derniers pronostics
                  </h4>
                  <div className="space-y-2">
                    {(selectedStats.recent_predictions ?? [])
                      .slice(0, 6)
                      .map((prediction: Record<string, unknown>) => (
                        <div
                          key={String(prediction.id ?? `${prediction.race_id}`)}
                          className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <RaceEntityToken
                              raceId={String(prediction.race_id ?? "")}
                              raceName={String(
                                prediction.race_name ?? prediction.race_id ?? "Course",
                              )}
                              href={
                                prediction.race_id
                                  ? `/results/${String(prediction.race_id)}`
                                  : undefined
                              }
                              className="max-w-[220px] font-body text-xs tracking-normal"
                            />
                            <p className="mt-1 font-body text-[11px] text-gray-500 leading-7">
                              <DateEntityToken
                                value={String(prediction.updated_at ?? prediction.created_at ?? "")}
                              />
                            </p>
                          </div>
                          <span className="shrink-0 font-data text-xs text-orange-400">
                            {prediction.score_preview
                              ? `${(prediction.score_preview as { total?: number }).total ?? 0} pts`
                              : prediction.is_complete
                                ? "complet"
                                : "incomplet"}
                          </span>
                        </div>
                      ))}
                    {(selectedStats.recent_predictions ?? []).length === 0 && (
                      <p className="font-body text-xs text-gray-500">Aucun pronostic.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="mb-3 font-heading text-xs uppercase text-white">
                    Activité admin récente
                  </h4>
                  <div className="space-y-2">
                    {(selectedStats.recent_activity ?? [])
                      .slice(0, 6)
                      .map((log: Record<string, unknown>) => (
                        <div
                          key={String(log.id)}
                          className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                          <p className="font-body text-sm text-gray-200">
                            {String(log.action ?? "activité")}
                          </p>
                          <p className="font-body text-[11px] text-gray-500">
                            {String(log.actor_email ?? "admin")} · {formatDateTime(log.created_at)}
                          </p>
                        </div>
                      ))}
                    {(selectedStats.recent_activity ?? []).length === 0 && (
                      <p className="font-body text-xs text-gray-500">Aucun log admin.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="mb-3 flex items-center gap-2 font-heading text-xs uppercase text-white">
                    <Trophy className="h-4 w-4 text-orange-400" />
                    Scores
                  </h4>
                  <div className="space-y-2">
                    {(selectedStats.leaderboard_entries ?? [])
                      .slice(0, 6)
                      .map((entry: Record<string, unknown>) => (
                        <div
                          key={String(`${entry.league_id}-${entry.championship_id ?? "main"}`)}
                          className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                          <p className="truncate font-body text-sm text-gray-200">
                            {String(entry.league_name ?? entry.league_id ?? "Ligue")}
                          </p>
                          <p className="font-data text-[11px] text-orange-400">
                            {String(entry.total_points ?? 0)} pts · dernier GP{" "}
                            {String(entry.last_race_points ?? 0)}
                          </p>
                        </div>
                      ))}
                    {(selectedStats.leaderboard_entries ?? []).length === 0 && (
                      <p className="font-body text-xs text-gray-500">Aucun score ligue.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="mb-3 flex items-center gap-2 font-heading text-xs uppercase text-white">
                    <Bell className="h-4 w-4 text-cyan-400" />
                    Notifications
                  </h4>
                  <div className="space-y-2">
                    {(selectedStats.notifications ?? [])
                      .slice(0, 6)
                      .map((notification: Record<string, unknown>) => (
                        <div
                          key={String(notification.id)}
                          className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                          <p className="truncate font-body text-sm text-gray-200">
                            {String(notification.title ?? "Notification")}
                          </p>
                          <p className="font-body text-[11px] text-gray-500">
                            {notification.is_read ? "lue" : "non lue"} ·{" "}
                            {formatDateTime(notification.created_at)}
                          </p>
                        </div>
                      ))}
                    {(selectedStats.notifications ?? []).length === 0 && (
                      <p className="font-body text-xs text-gray-500">Aucune notification.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="mb-3 flex items-center gap-2 font-heading text-xs uppercase text-white">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    Discussions
                  </h4>
                  <div className="space-y-2">
                    {(selectedStats.support_messages ?? [])
                      .slice(0, 6)
                      .map((message: Record<string, unknown>) => (
                        <div
                          key={String(message.id)}
                          className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                          <p className="line-clamp-2 font-body text-sm text-gray-200">
                            {String(message.content ?? "Message")}
                          </p>
                          <p className="font-body text-[11px] text-gray-500">
                            {String(message.league_name ?? message.league_id ?? "Ligue")} ·{" "}
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      ))}
                    {(selectedStats.support_messages ?? []).length === 0 && (
                      <p className="font-body text-xs text-gray-500">Aucun message de ligue.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <h4 className="mb-3 flex items-center gap-2 font-heading text-xs uppercase text-white">
                    <MessageCircle className="h-4 w-4 text-amber-400" />
                    Feedbacks
                  </h4>
                  <div className="space-y-2">
                    {(selectedStats.feedbacks ?? [])
                      .slice(0, 6)
                      .map((feedback: Record<string, unknown>) => (
                        <div
                          key={String(feedback.id)}
                          className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                        >
                          <p className="line-clamp-2 font-body text-sm text-gray-200">
                            {String(feedback.message ?? "Feedback")}
                          </p>
                          <p className="font-body text-[11px] text-gray-500">
                            {String(feedback.category ?? "feedback")} ·{" "}
                            {formatDateTime(feedback.created_at)}
                          </p>
                        </div>
                      ))}
                    {(selectedStats.feedbacks ?? []).length === 0 && (
                      <p className="font-body text-xs text-gray-500">Aucun feedback.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 font-body text-xs uppercase">
                  <th className="text-left p-3">Pseudo</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Niveau</th>
                  <th className="text-left p-3">XP</th>
                  <th className="text-left p-3">Inscrit le</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: Record<string, unknown>) => (
                  <tr
                    key={user.id as string}
                    className="border-b border-gray-800/50 hover:bg-white/5"
                  >
                    <td className="p-3 font-body text-white">
                      <UserIdentity
                        user={userIdentityFromRecord(user)}
                        surface="admin"
                        size="sm"
                        showLevel
                        className="max-w-[240px]"
                        data-testid={`admin-user-row-identity-${String(user.id)}`}
                      />
                      {!!user.is_banned && (
                        <span className="ml-2 text-xs text-red-400 bg-red-500/20 px-1 rounded">
                          banni
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-400 font-body">{user.email as string}</td>
                    <td className="p-3 font-data text-cyan-400">{user.level as number}</td>
                    <td className="p-3 font-data text-orange-400">{user.xp as number}</td>
                    <td className="p-3 text-gray-500 font-body text-xs">
                      {user.created_at
                        ? new Date(user.created_at as string).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => selectUser(user.id as string)}
                          className="p-1.5 text-gray-400 hover:text-cyan-400 rounded"
                          title="Détails"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-gray-400 hover:text-cyan-400 rounded"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleBan(user.id as string, !!user.is_banned)}
                          className={`p-1.5 rounded ${user.is_banned ? "text-green-400 hover:text-green-300" : "text-yellow-400 hover:text-yellow-300"}`}
                          title={user.is_banned ? "Débannir" : "Bannir"}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              user.id as string,
                              (user.username as string) || (user.email as string),
                            )
                          }
                          className="p-1.5 text-gray-400 hover:text-red-400 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-body">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between p-3 border-t border-gray-800">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-gray-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-body text-xs text-gray-500">
                Page {page + 1} / {Math.ceil(total / limit)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(page + 1)}
                className="text-gray-400"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
