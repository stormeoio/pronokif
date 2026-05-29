/**
 * Admin predictions tab — moderation, scoring preview and corrective editing.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Download,
  Edit2,
  Eye,
  Loader2,
  Lock,
  Search,
  Trash2,
  Unlock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type AdminPrediction = {
  id?: string;
  user_id?: string;
  race_id?: string;
  user_email?: string;
  user_username?: string;
  race_name?: string;
  race_date?: string;
  created_at?: string;
  updated_at?: string;
  completion_status?: "complete" | "incomplete";
  is_complete?: boolean;
  missing_fields?: string[];
  locked?: boolean;
  review_status?: string;
  admin_note?: string;
  quali_pole?: string;
  quali_top10?: string[];
  race_winner?: string;
  race_top10?: string[];
  sprint_quali_pole?: string;
  sprint_quali_top10?: string[];
  sprint_race_winner?: string;
  sprint_race_top10?: string[];
  score_preview?: { total: number; xp_earned?: number; details?: string[] } | null;
};

type PredictionAnalyticsRace = {
  race_id: string;
  race_name?: string;
  total: number;
  complete: number;
  locked: number;
  average_points: number;
};

type PredictionAnalyticsUser = {
  user_id: string;
  user_email?: string;
  user_username?: string;
  predictions_count: number;
  complete_predictions: number;
  total_points: number;
  average_points: number;
};

type PredictionDraft = {
  quali_pole: string;
  quali_top10: string;
  race_winner: string;
  race_top10: string;
  sprint_quali_pole: string;
  sprint_quali_top10: string;
  sprint_race_winner: string;
  sprint_race_top10: string;
  locked: boolean;
  review_status: string;
  admin_note: string;
};

const EMPTY_DRAFT: PredictionDraft = {
  quali_pole: "",
  quali_top10: "",
  race_winner: "",
  race_top10: "",
  sprint_quali_pole: "",
  sprint_quali_top10: "",
  sprint_race_winner: "",
  sprint_race_top10: "",
  locked: false,
  review_status: "",
  admin_note: "",
};

function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function formatDrivers(value: unknown) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function parseDrivers(value: string) {
  return value
    .split(/[\s,;]+/)
    .map((driver) => driver.trim().toUpperCase())
    .filter(Boolean);
}

function predictionToDraft(prediction: AdminPrediction): PredictionDraft {
  return {
    quali_pole: prediction.quali_pole ?? "",
    quali_top10: formatDrivers(prediction.quali_top10),
    race_winner: prediction.race_winner ?? "",
    race_top10: formatDrivers(prediction.race_top10),
    sprint_quali_pole: prediction.sprint_quali_pole ?? "",
    sprint_quali_top10: formatDrivers(prediction.sprint_quali_top10),
    sprint_race_winner: prediction.sprint_race_winner ?? "",
    sprint_race_top10: formatDrivers(prediction.sprint_race_top10),
    locked: !!prediction.locked,
    review_status: prediction.review_status ?? "",
    admin_note: prediction.admin_note ?? "",
  };
}

function draftToPayload(draft: PredictionDraft) {
  return {
    quali_pole: draft.quali_pole.trim() || null,
    quali_top10: parseDrivers(draft.quali_top10),
    race_winner: draft.race_winner.trim() || null,
    race_top10: parseDrivers(draft.race_top10),
    sprint_quali_pole: draft.sprint_quali_pole.trim() || null,
    sprint_quali_top10: parseDrivers(draft.sprint_quali_top10),
    sprint_race_winner: draft.sprint_race_winner.trim() || null,
    sprint_race_top10: parseDrivers(draft.sprint_race_top10),
    locked: draft.locked,
    review_status: draft.review_status.trim() || null,
    admin_note: draft.admin_note.trim() || null,
  };
}

function StatCard({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: unknown;
  tone?: string;
}) {
  return (
    <div className="card-arcade border-l-4 border-pk-red p-3">
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-1 font-data text-2xl ${tone}`}>{String(value ?? 0)}</p>
    </div>
  );
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

export default function PredictionsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [lockedFilter, setLockedFilter] = useState("");
  const [selectedPrediction, setSelectedPrediction] = useState<AdminPrediction | null>(null);
  const [draft, setDraft] = useState<PredictionDraft>(EMPTY_DRAFT);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchReviewStatus, setBatchReviewStatus] = useState("in_review");
  const limit = 20;

  const filterParams = {
    q: q.trim() || undefined,
    status: status || undefined,
    locked: lockedFilter === "" ? undefined : lockedFilter === "locked",
  };

  const listParams = {
    ...filterParams,
    skip: page * limit,
    limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "predictions", listParams],
    queryFn: () => adminApi.predictions.list(listParams),
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-bo", "predictions", "analytics", filterParams],
    queryFn: () => adminApi.predictions.analytics(filterParams),
  });

  const predictions = (data?.predictions ?? []) as AdminPrediction[];
  const total = data?.total ?? 0;
  const summary = data?.summary ?? {};

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedPrediction?.id) throw new Error("Prediction id missing");
      return adminApi.predictions.update(selectedPrediction.id, draftToPayload(draft));
    },
    onSuccess: () => {
      toast.success("Pronostic mis à jour");
      setSelectedPrediction(null);
      setDraft(EMPTY_DRAFT);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    },
    onError: () => toast.error("Impossible de modifier ce pronostic"),
  });

  const batchMutation = useMutation({
    mutationFn: (data: {
      action: "lock" | "unlock" | "delete" | "set_review_status";
      review_status?: string;
    }) => adminApi.predictions.batch({ ids: selectedIds, ...data }),
    onSuccess: (result) => {
      toast.success(`${result.modified ?? result.matched ?? 0} pronostic(s) traité(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    },
    onError: () => toast.error("Action de masse impossible"),
  });

  const exportMutation = useMutation({
    mutationFn: () => adminApi.predictions.exportCsv({ ...filterParams, export_limit: 5000 }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-predictions.csv");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const lockMutation = useMutation({
    mutationFn: (prediction: AdminPrediction) =>
      adminApi.predictions.lock(String(prediction.id), { locked: !prediction.locked }),
    onSuccess: () => {
      toast.success("Statut de verrouillage mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    },
    onError: () => toast.error("Impossible de changer le verrouillage"),
  });

  const deleteMutation = useMutation({
    mutationFn: (predictionId: string) => adminApi.predictions.delete(predictionId),
    onSuccess: () => {
      toast.success("Pronostic supprimé");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
    },
    onError: () => toast.error("Impossible de supprimer ce pronostic"),
  });

  const openEditor = (prediction: AdminPrediction) => {
    setSelectedPrediction(prediction);
    setDraft(predictionToDraft(prediction));
  };

  const pageIds = predictions.map((prediction) => prediction.id).filter(Boolean) as string[];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const togglePrediction = (predictionId?: string) => {
    if (!predictionId) return;
    setSelectedIds((current) =>
      current.includes(predictionId)
        ? current.filter((id) => id !== predictionId)
        : [...current, predictionId],
    );
  };

  const togglePage = () => {
    setSelectedIds((current) => {
      if (allPageSelected) {
        return current.filter((id) => !pageIds.includes(id));
      }
      return Array.from(new Set([...current, ...pageIds]));
    });
  };

  const runBatchDelete = () => {
    if (!selectedIds.length) return;
    if (!confirm(`Supprimer ${selectedIds.length} pronostic(s) sélectionné(s) ?`)) return;
    batchMutation.mutate({ action: "delete" });
  };

  const handleDelete = (prediction: AdminPrediction) => {
    if (!prediction.id) return;
    const label = `${prediction.user_email ?? prediction.user_id} / ${prediction.race_name ?? prediction.race_id}`;
    if (!confirm(`Supprimer le pronostic ${label} ?`)) return;
    deleteMutation.mutate(prediction.id);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Pronostics</h2>
          <p className="font-body text-xs text-gray-500">
            Supervision, correction et verrouillage des picks joueurs.
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
        <StatCard label="Soumis" value={summary.total ?? total} />
        <StatCard label="Complets" value={summary.complete} tone="text-emerald-400" />
        <StatCard label="Incomplets" value={summary.incomplete} tone="text-amber-400" />
        <StatCard label="Verrouillés" value={summary.locked} tone="text-red-400" />
        <StatCard label="Scorés" value={summary.scored} tone="text-cyan-400" />
        <StatCard label="Joueurs" value={summary.users_count} tone="text-orange-400" />
      </div>

      {!!analytics && (
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <section className="card-arcade p-4">
            <h3 className="mb-3 font-heading text-xs uppercase text-white">Courses actives</h3>
            <div className="space-y-2">
              {((analytics.by_race ?? []) as PredictionAnalyticsRace[])
                .slice()
                .sort((a, b) => b.total - a.total)
                .slice(0, 4)
                .map((race) => (
                  <div
                    key={race.race_id}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-gray-200">
                        {race.race_name ?? race.race_id}
                      </p>
                      <p className="font-body text-[11px] text-gray-500">
                        {race.complete}/{race.total} complets · {race.locked} verrouillés
                      </p>
                    </div>
                    <span className="shrink-0 font-data text-xs text-cyan-400">
                      {race.average_points} pts moy.
                    </span>
                  </div>
                ))}
              {(analytics.by_race ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">Pas encore de course active.</p>
              )}
            </div>
          </section>

          <section className="card-arcade p-4">
            <h3 className="mb-3 font-heading text-xs uppercase text-white">Top joueurs scorés</h3>
            <div className="space-y-2">
              {((analytics.top_users ?? []) as PredictionAnalyticsUser[])
                .slice(0, 4)
                .map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm text-gray-200">
                        {user.user_username ?? user.user_email ?? user.user_id}
                      </p>
                      <p className="font-body text-[11px] text-gray-500">
                        {user.complete_predictions}/{user.predictions_count} complets ·{" "}
                        {user.average_points} pts moy.
                      </p>
                    </div>
                    <span className="shrink-0 font-data text-xs text-orange-400">
                      {user.total_points} pts
                    </span>
                  </div>
                ))}
              {(analytics.top_users ?? []).length === 0 && (
                <p className="font-body text-xs text-gray-500">Aucun score calculé.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher joueur, email, course..."
              className="border-gray-700 bg-gray-900 pl-10 text-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="complete">Complets</option>
            <option value="incomplete">Incomplets</option>
            <option value="scored">Scorés</option>
            <option value="unscored">Non scorés</option>
          </select>
          <select
            value={lockedFilter}
            onChange={(e) => {
              setLockedFilter(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            <option value="">Tous</option>
            <option value="locked">Verrouillés</option>
            <option value="unlocked">Ouverts</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setStatus("");
              setLockedFilter("");
              setPage(0);
            }}
            className="text-xs text-gray-400"
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="card-arcade mb-4 border border-pk-red/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm uppercase text-white">Actions de masse</h3>
              <p className="font-body text-xs text-gray-500">
                {selectedIds.length} pronostic{selectedIds.length > 1 ? "s" : ""} sélectionné
                {selectedIds.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={batchReviewStatus}
                onChange={(e) => setBatchReviewStatus(e.target.value)}
                className="h-9 rounded-sm border border-gray-700 bg-gray-900 px-3 font-body text-xs text-white"
              >
                <option value="in_review">À revoir</option>
                <option value="validated">Validé</option>
                <option value="flagged">Signalé</option>
                <option value="archived">Archivé</option>
              </select>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() =>
                  batchMutation.mutate({
                    action: "set_review_status",
                    review_status: batchReviewStatus,
                  })
                }
                className="text-xs text-cyan-300"
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Statut
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate({ action: "lock" })}
                className="text-xs text-yellow-300"
              >
                <Lock className="mr-1 h-4 w-4" />
                Verrouiller
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate({ action: "unlock" })}
                className="text-xs text-emerald-300"
              >
                <Unlock className="mr-1 h-4 w-4" />
                Ouvrir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={runBatchDelete}
                className="text-xs text-red-300"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Supprimer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={batchMutation.isPending}
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedPrediction && (
        <section className="card-arcade mb-4 border border-orange-500/30 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm uppercase text-orange-400">Édition admin</h3>
              <p className="font-body text-xs text-gray-500">
                {selectedPrediction.user_email ?? selectedPrediction.user_id} ·{" "}
                {selectedPrediction.race_name ?? selectedPrediction.race_id}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 font-body text-xs text-gray-400">
                <Switch
                  checked={draft.locked}
                  onCheckedChange={(checked) => setDraft({ ...draft, locked: checked })}
                />
                Verrouillé
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedPrediction(null);
                  setDraft(EMPTY_DRAFT);
                }}
                className="text-xs text-gray-400"
              >
                Fermer
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={draft.quali_pole}
              onChange={(e) => setDraft({ ...draft, quali_pole: e.target.value })}
              placeholder="Pole qualifs"
              className="border-gray-700 bg-gray-900 text-white"
            />
            <Input
              value={draft.race_winner}
              onChange={(e) => setDraft({ ...draft, race_winner: e.target.value })}
              placeholder="Vainqueur course"
              className="border-gray-700 bg-gray-900 text-white"
            />
            <Textarea
              value={draft.quali_top10}
              onChange={(e) => setDraft({ ...draft, quali_top10: e.target.value })}
              placeholder="Top 10 qualifs : VER, NOR, LEC..."
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white"
            />
            <Textarea
              value={draft.race_top10}
              onChange={(e) => setDraft({ ...draft, race_top10: e.target.value })}
              placeholder="Top 10 course : NOR, VER, LEC..."
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white"
            />
            <Input
              value={draft.sprint_quali_pole}
              onChange={(e) => setDraft({ ...draft, sprint_quali_pole: e.target.value })}
              placeholder="Pole sprint"
              className="border-gray-700 bg-gray-900 text-white"
            />
            <Input
              value={draft.sprint_race_winner}
              onChange={(e) => setDraft({ ...draft, sprint_race_winner: e.target.value })}
              placeholder="Vainqueur sprint"
              className="border-gray-700 bg-gray-900 text-white"
            />
            <Textarea
              value={draft.sprint_quali_top10}
              onChange={(e) => setDraft({ ...draft, sprint_quali_top10: e.target.value })}
              placeholder="Top 10 sprint qualifs"
              rows={2}
              className="resize-none border-gray-700 bg-gray-900 text-white"
            />
            <Textarea
              value={draft.sprint_race_top10}
              onChange={(e) => setDraft({ ...draft, sprint_race_top10: e.target.value })}
              placeholder="Top 10 sprint course"
              rows={2}
              className="resize-none border-gray-700 bg-gray-900 text-white"
            />
            <Input
              value={draft.review_status}
              onChange={(e) => setDraft({ ...draft, review_status: e.target.value })}
              placeholder="Statut de revue"
              className="border-gray-700 bg-gray-900 text-white"
            />
            <Textarea
              value={draft.admin_note}
              onChange={(e) => setDraft({ ...draft, admin_note: e.target.value })}
              placeholder="Note admin"
              rows={2}
              className="resize-none border-gray-700 bg-gray-900 text-white"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="btn-racing text-xs"
            >
              {updateMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : predictions.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <BarChart3 className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">Aucun pronostic enregistré</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      className="h-4 w-4 rounded border-white/20 bg-gray-900 text-pk-red focus:ring-pk-red/40"
                      aria-label="Sélectionner la page"
                    />
                  </th>
                  <th className="p-3 text-left">Course</th>
                  <th className="p-3 text-left">Joueur</th>
                  <th className="p-3 text-left">État</th>
                  <th className="p-3 text-left">Pick principal</th>
                  <th className="p-3 text-left">Score</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((prediction) => (
                  <tr
                    key={String(prediction.id ?? `${prediction.user_id}-${prediction.race_id}`)}
                    className="border-b border-gray-800/50 hover:bg-white/5"
                  >
                    <td className="p-3 align-top">
                      <input
                        type="checkbox"
                        checked={!!prediction.id && selectedIds.includes(prediction.id)}
                        onChange={() => togglePrediction(prediction.id)}
                        className="h-4 w-4 rounded border-white/20 bg-gray-900 text-pk-red focus:ring-pk-red/40"
                        aria-label="Sélectionner ce pronostic"
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-body text-white">
                        {prediction.race_name ?? prediction.race_id ?? "—"}
                      </p>
                      <p className="font-body text-[11px] text-gray-500">
                        {formatDate(prediction.race_date)}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-body text-gray-300">
                        {prediction.user_username ?? "Joueur"}
                      </p>
                      <p className="font-body text-[11px] text-gray-500">
                        {prediction.user_email ?? prediction.user_id ?? "—"}
                      </p>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-sm px-2 py-1 font-data text-[10px] uppercase ${
                            prediction.is_complete
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {prediction.is_complete ? "complet" : "incomplet"}
                        </span>
                        {prediction.locked && (
                          <span className="rounded-sm bg-red-500/15 px-2 py-1 font-data text-[10px] uppercase text-red-300">
                            verrouillé
                          </span>
                        )}
                      </div>
                      {!!prediction.missing_fields?.length && (
                        <p className="mt-1 max-w-[180px] truncate font-body text-[11px] text-gray-500">
                          {prediction.missing_fields.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="p-3 font-body text-gray-300">
                      <span className="text-gray-500">Pole</span> {prediction.quali_pole ?? "—"}
                      <span className="mx-2 text-gray-700">/</span>
                      <span className="text-gray-500">Win</span> {prediction.race_winner ?? "—"}
                    </td>
                    <td className="p-3 font-data text-orange-400">
                      {prediction.score_preview ? `${prediction.score_preview.total} pts` : "—"}
                    </td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      {formatDateTime(prediction.updated_at ?? prediction.created_at)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditor(prediction)}
                          className="rounded p-1.5 text-gray-400 hover:text-cyan-400"
                          title="Ouvrir"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEditor(prediction)}
                          className="rounded p-1.5 text-gray-400 hover:text-orange-400"
                          title="Modifier"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => lockMutation.mutate(prediction)}
                          className="rounded p-1.5 text-gray-400 hover:text-yellow-300"
                          title={prediction.locked ? "Déverrouiller" : "Verrouiller"}
                        >
                          {prediction.locked ? (
                            <Unlock className="h-3.5 w-3.5" />
                          ) : (
                            <Lock className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(prediction)}
                          className="rounded p-1.5 text-gray-400 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
