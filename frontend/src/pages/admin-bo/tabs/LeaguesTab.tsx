/**
 * Admin leagues tab — community moderation and league operations.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Edit2,
  Eye,
  Loader2,
  Network,
  Plus,
  Save,
  Search,
  Trash2,
  Trophy,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type LeagueMember = {
  user_id: string;
  email?: string | null;
  username?: string | null;
  is_owner?: boolean;
  total_points?: number;
  last_race_points?: number;
  leaderboard_position?: number;
};

type League = {
  id: string;
  name?: string;
  description?: string | null;
  code?: string;
  created_by?: string | null;
  created_at?: string;
  members?: string[];
  members_count?: number;
  owner_email?: string | null;
  owner_username?: string | null;
  messages_count?: number;
  total_points?: number;
  average_points?: number;
  review_status?: string | null;
  admin_note?: string | null;
  is_archived?: boolean;
  member_details?: LeagueMember[];
  top_members?: LeagueMember[];
};

type LeagueDraft = {
  name: string;
  description: string;
  code: string;
  review_status: string;
  admin_note: string;
  is_archived: boolean;
};

type LeagueAnalyticsRow = {
  id: string;
  name?: string;
  code?: string;
  members_count?: number;
  messages_count?: number;
  total_points?: number;
};

const EMPTY_DRAFT: LeagueDraft = {
  name: "",
  description: "",
  code: "",
  review_status: "",
  admin_note: "",
  is_archived: false,
};

function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(value: unknown) {
  return new Intl.NumberFormat("fr-FR").format(Number(value ?? 0));
}

function leagueToDraft(league?: League | null): LeagueDraft {
  if (!league) return EMPTY_DRAFT;
  return {
    name: league.name ?? "",
    description: league.description ?? "",
    code: league.code ?? "",
    review_status: league.review_status ?? "",
    admin_note: league.admin_note ?? "",
    is_archived: !!league.is_archived,
  };
}

function draftToPayload(draft: LeagueDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    code: draft.code.trim().toUpperCase(),
    review_status: draft.review_status.trim() || null,
    admin_note: draft.admin_note.trim() || null,
    is_archived: draft.is_archived,
  };
}

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

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "text-white",
}: {
  icon: LucideIcon;
  label: string;
  value: unknown;
  tone?: string;
}) {
  return (
    <div className="card-arcade border-l-4 border-pk-red p-3">
      <Icon className="mb-2 h-4 w-4 text-pk-red" />
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-1 font-data text-2xl ${tone}`}>{formatNumber(value)}</p>
    </div>
  );
}

function memberLabel(member: LeagueMember) {
  return member.username || member.email || member.user_id;
}

export default function LeaguesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeagueDraft>(EMPTY_DRAFT);
  const [memberToAdd, setMemberToAdd] = useState("");
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "leagues", search, page],
    queryFn: () => adminApi.leagues.list({ search, skip: page * limit, limit }),
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-bo", "leagues", "analytics", search],
    queryFn: () => adminApi.leagues.analytics({ search }),
  });

  const selectedLeagueQuery = useQuery({
    queryKey: ["admin-bo", "leagues", selectedLeagueId, "detail"],
    queryFn: () => adminApi.leagues.get(String(selectedLeagueId)),
    enabled: !!selectedLeagueId,
  });

  const leagues = (data?.leagues ?? []) as League[];
  const total = data?.total ?? 0;
  const selectedLeague = selectedLeagueQuery.data as League | undefined;
  const summary = analytics?.summary ?? {};

  useEffect(() => {
    if (selectedLeague) {
      setDraft(leagueToDraft(selectedLeague));
    }
  }, [selectedLeague]);

  const invalidateLeagueData = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "leagues"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
  };

  const exportMutation = useMutation({
    mutationFn: () => adminApi.leagues.exportCsv({ search, export_limit: 5000 }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-leagues.csv");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedLeagueId) throw new Error("League id missing");
      return adminApi.leagues.update(selectedLeagueId, draftToPayload(draft));
    },
    onSuccess: () => {
      toast.success("Ligue mise à jour");
      invalidateLeagueData();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Impossible de modifier cette ligue");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: () => {
      if (!selectedLeagueId) throw new Error("League id missing");
      return adminApi.leagues.addMember(selectedLeagueId, memberToAdd.trim());
    },
    onSuccess: () => {
      toast.success("Membre ajouté");
      setMemberToAdd("");
      invalidateLeagueData();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Impossible d'ajouter ce membre");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!selectedLeagueId) throw new Error("League id missing");
      return adminApi.leagues.removeMember(selectedLeagueId, userId);
    },
    onSuccess: () => {
      toast.success("Membre retiré");
      invalidateLeagueData();
    },
    onError: () => toast.error("Impossible de retirer ce membre"),
  });

  const transferOwnerMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!selectedLeagueId) throw new Error("League id missing");
      return adminApi.leagues.transferOwner(selectedLeagueId, userId);
    },
    onSuccess: () => {
      toast.success("Propriété transférée");
      invalidateLeagueData();
    },
    onError: () => toast.error("Impossible de transférer la propriété"),
  });

  const deleteMutation = useMutation({
    mutationFn: (leagueId: string) => adminApi.leagues.delete(leagueId),
    onSuccess: () => {
      toast.success("Ligue supprimée");
      setSelectedLeagueId(null);
      setDraft(EMPTY_DRAFT);
      invalidateLeagueData();
    },
    onError: () => toast.error("Impossible de supprimer cette ligue"),
  });

  const handleDelete = (league: League) => {
    if (!confirm(`Supprimer la ligue ${league.name ?? league.id} et ses données liées ?`)) return;
    deleteMutation.mutate(league.id);
  };

  const handleAddMember = (event: React.FormEvent) => {
    event.preventDefault();
    if (!memberToAdd.trim()) {
      toast.error("Renseignez un ID utilisateur");
      return;
    }
    addMemberMutation.mutate();
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Ligues</h2>
          <p className="font-body text-xs text-gray-500">
            Modération des communautés, membres et classements privés.
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
          <span className="font-data text-sm text-gray-500">{formatNumber(total)} au total</span>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard icon={Network} label="Ligues" value={summary.leagues_count ?? total} />
        <StatCard
          icon={Activity}
          label="Actives"
          value={summary.active_leagues}
          tone="text-emerald-400"
        />
        <StatCard
          icon={Network}
          label="Membres"
          value={summary.total_memberships}
          tone="text-orange-400"
        />
        <StatCard
          icon={Activity}
          label="Moy. membres"
          value={summary.average_members}
          tone="text-cyan-400"
        />
        <StatCard
          icon={Activity}
          label="Messages"
          value={summary.total_messages}
          tone="text-amber-400"
        />
        <StatCard icon={Trophy} label="Points" value={summary.total_points} tone="text-red-300" />
      </div>

      {!!analytics && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <section className="card-arcade p-4">
            <h3 className="mb-3 font-heading text-xs uppercase text-white">
              Ligues les plus peuplées
            </h3>
            <div className="space-y-2">
              {((analytics.top_by_members ?? []) as LeagueAnalyticsRow[])
                .slice(0, 5)
                .map((league) => (
                  <div
                    key={league.id}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-gray-200">
                        {league.name ?? league.id}
                      </p>
                      <p className="font-data text-[11px] text-gray-500">{league.code ?? "—"}</p>
                    </div>
                    <span className="shrink-0 font-data text-xs text-orange-400">
                      {formatNumber(league.members_count)} membres
                    </span>
                  </div>
                ))}
              {(analytics.top_by_members ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">Aucune ligue à afficher.</p>
              )}
            </div>
          </section>

          <section className="card-arcade p-4">
            <h3 className="mb-3 font-heading text-xs uppercase text-white">
              Classements les plus actifs
            </h3>
            <div className="space-y-2">
              {((analytics.top_by_points ?? []) as LeagueAnalyticsRow[])
                .slice(0, 5)
                .map((league) => (
                  <div
                    key={league.id}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-gray-200">
                        {league.name ?? league.id}
                      </p>
                      <p className="font-body text-[11px] text-gray-500">
                        {formatNumber(league.messages_count)} messages
                      </p>
                    </div>
                    <span className="shrink-0 font-data text-xs text-cyan-400">
                      {formatNumber(league.total_points)} pts
                    </span>
                  </div>
                ))}
              {(analytics.top_by_points ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">Aucun point de classement.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="card-arcade mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Rechercher une ligue par nom, code ou description..."
            className="border-gray-700 bg-gray-900 pl-10 text-white"
          />
        </div>
      </div>

      {selectedLeagueId && (
        <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="card-arcade border border-orange-500/30 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg uppercase text-white">
                  {selectedLeague?.name ?? "Ligue sélectionnée"}
                </h3>
                <p className="font-data text-[11px] uppercase tracking-[0.16em] text-gray-500">
                  {selectedLeague?.code ?? selectedLeagueId}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedLeagueId(null);
                  setDraft(EMPTY_DRAFT);
                }}
                className="text-xs text-gray-400"
              >
                Fermer
              </Button>
            </div>

            {selectedLeagueQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Nom
                    </label>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="border-gray-700 bg-gray-900 text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Code
                    </label>
                    <Input
                      value={draft.code}
                      onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                      className="border-gray-700 bg-gray-900 font-data text-cyan-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    Description
                  </label>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={3}
                    className="border-gray-700 bg-gray-900 text-white"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                  <div>
                    <label className="mb-1 block font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                      Statut revue
                    </label>
                    <select
                      value={draft.review_status}
                      onChange={(e) => setDraft({ ...draft, review_status: e.target.value })}
                      className="h-10 w-full rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
                    >
                      <option value="">Non classée</option>
                      <option value="in_review">À revoir</option>
                      <option value="validated">Validée</option>
                      <option value="flagged">Signalée</option>
                      <option value="archived">Archivée</option>
                    </select>
                  </div>
                  <label className="flex items-end gap-3 pb-2 font-body text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={draft.is_archived}
                      onChange={(e) => setDraft({ ...draft, is_archived: e.target.checked })}
                      className="h-4 w-4 accent-pk-red"
                    />
                    Archiver la ligue
                  </label>
                </div>

                <div>
                  <label className="mb-1 block font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    Note admin
                  </label>
                  <Textarea
                    value={draft.admin_note}
                    onChange={(e) => setDraft({ ...draft, admin_note: e.target.value })}
                    rows={3}
                    className="border-gray-700 bg-gray-900 text-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
                  <div className="grid grid-cols-3 gap-4 font-data text-xs">
                    <span className="text-gray-500">
                      Membres{" "}
                      <strong className="text-orange-400">
                        {selectedLeague?.members_count ?? 0}
                      </strong>
                    </span>
                    <span className="text-gray-500">
                      Messages{" "}
                      <strong className="text-amber-400">
                        {selectedLeague?.messages_count ?? 0}
                      </strong>
                    </span>
                    <span className="text-gray-500">
                      Points{" "}
                      <strong className="text-cyan-400">{selectedLeague?.total_points ?? 0}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate()}
                      className="text-xs text-emerald-300"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                    {selectedLeague && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(selectedLeague)}
                        className="text-xs text-red-300"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="card-arcade border border-cyan-500/20 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-sm uppercase text-white">Membres</h3>
                <p className="font-body text-xs text-gray-500">
                  {selectedLeague?.owner_username ??
                    selectedLeague?.owner_email ??
                    selectedLeague?.created_by ??
                    "—"}
                </p>
              </div>
              <Crown className="h-5 w-5 text-amber-400" />
            </div>

            <form onSubmit={handleAddMember} className="mb-4 flex gap-2">
              <Input
                value={memberToAdd}
                onChange={(e) => setMemberToAdd(e.target.value)}
                placeholder="ID utilisateur"
                className="border-gray-700 bg-gray-900 text-white"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={addMemberMutation.isPending}
                className="shrink-0 text-xs text-emerald-300"
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </form>

            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {(selectedLeague?.member_details ?? []).map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {member.is_owner && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                      <p className="truncate font-body text-sm text-gray-200">
                        {memberLabel(member)}
                      </p>
                    </div>
                    <p className="font-data text-[11px] text-gray-500">
                      {formatNumber(member.total_points)} pts · {member.user_id}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!member.is_owner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={transferOwnerMutation.isPending}
                        onClick={() => transferOwnerMutation.mutate(member.user_id)}
                        className="h-8 px-2 text-amber-300"
                        title="Transférer la propriété"
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={removeMemberMutation.isPending}
                      onClick={() => {
                        if (!confirm(`Retirer ${memberLabel(member)} de cette ligue ?`)) return;
                        removeMemberMutation.mutate(member.user_id);
                      }}
                      className="h-8 px-2 text-red-300"
                      title="Retirer le membre"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(selectedLeague?.member_details ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">Aucun membre rattaché.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : leagues.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Network className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">Aucune ligue trouvée</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="p-3 text-left">Ligue</th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Membres</th>
                  <th className="p-3 text-left">Activité</th>
                  <th className="p-3 text-left">Créateur</th>
                  <th className="p-3 text-left">Créée le</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((league) => (
                  <tr
                    key={league.id}
                    className={`border-b border-gray-800/50 hover:bg-white/5 ${
                      selectedLeagueId === league.id ? "bg-pk-red/10" : ""
                    }`}
                  >
                    <td className="p-3">
                      <p className="font-body text-white">{league.name ?? "Sans nom"}</p>
                      {league.description ? (
                        <p className="mt-0.5 max-w-md truncate font-body text-xs text-gray-500">
                          {league.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 font-data text-cyan-400">{league.code ?? "—"}</td>
                    <td className="p-3 font-data text-orange-400">
                      {formatNumber(league.members_count)}
                    </td>
                    <td className="p-3">
                      <p className="font-data text-xs text-gray-300">
                        {formatNumber(league.total_points)} pts
                      </p>
                      <p className="font-body text-[11px] text-gray-500">
                        {formatNumber(league.messages_count)} messages
                      </p>
                    </td>
                    <td className="p-3 font-body text-gray-400">
                      {league.owner_username ?? league.owner_email ?? league.created_by ?? "—"}
                    </td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      {formatDate(league.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLeagueId(league.id)}
                          className="h-8 px-2 text-cyan-300"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLeagueId(league.id)}
                          className="h-8 px-2 text-amber-300"
                          title="Éditer"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => handleDelete(league)}
                          className="h-8 px-2 text-red-300"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between border-t border-gray-800 p-3">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-gray-400"
              >
                <ChevronLeft className="h-4 w-4" />
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
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
