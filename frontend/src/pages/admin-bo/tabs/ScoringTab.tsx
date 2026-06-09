/**
 * Admin scoring tab — leaderboard reconciliation against scoring ledgers.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UserIdentity } from "@/components/users/UserIdentity";

type ReconciliationSummary = {
  rows_count: number;
  mismatches: number;
  missing_entries: number;
  positive_delta: number;
  negative_delta: number;
};

type ReconciliationRow = {
  league_id: string;
  user_id: string;
  entry_id?: string;
  position_hint: number;
  current_total: number;
  expected_total: number;
  delta: number;
  official_points: number;
  custom_points: number;
  has_entry: boolean;
};

type ReconciliationReport = {
  championship_id: string;
  summary: ReconciliationSummary;
  rows: ReconciliationRow[];
  applied?: boolean;
  repaired?: number;
};

type ScoreType = "all" | "official_race" | "custom_prediction";

type ScoreLedgerRow = {
  id: string;
  source: "official_race" | "custom_prediction";
  title?: string;
  prediction_id?: string;
  user_id?: string;
  user_email?: string;
  user_username?: string;
  user_avatar_id?: string | null;
  user_custom_avatar_url?: string | null;
  race_id?: string;
  race_name?: string;
  league_id?: string;
  league_name?: string;
  points: number;
  xp_awarded: number;
  is_correct?: boolean;
  scored_at?: string;
  scored_by?: string;
  details?: unknown[];
  breakdown?: Record<string, unknown>;
};

type ScoreLedgerResponse = {
  scores: ScoreLedgerRow[];
  total: number;
  skip: number;
  limit: number;
  summary: {
    total_rows: number;
    official_rows: number;
    custom_rows: number;
    points_total: number;
    xp_total: number;
    custom_correct: number;
  };
};

type RaceOption = {
  id: string;
  name: string;
  has_results?: boolean;
  is_cancelled?: boolean;
  round_number?: number;
};

const DEFAULT_CHAMPIONSHIP_ID = "championship-f1-2026";
const LEDGER_LIMIT = 25;

function formatDateTime(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCompactValue(value: unknown) {
  if (!value) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="card-arcade border-l-4 border-pk-red p-3">
      <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className={`mt-1 font-data text-2xl tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-data text-xs text-emerald-300">
        <CheckCircle2 className="h-3 w-3" /> 0
      </span>
    );
  }
  const tone =
    delta > 0
      ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
      : "border-red-500/25 bg-red-500/10 text-red-300";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-data text-xs tabular-nums ${tone}`}
    >
      <AlertTriangle className="h-3 w-3" />
      {delta > 0 ? `+${delta}` : delta}
    </span>
  );
}

function SourceBadge({ source }: { source: ScoreLedgerRow["source"] }) {
  const label = source === "official_race" ? "Officiel" : "Custom";
  const tone =
    source === "official_race"
      ? "border-blue-500/25 bg-blue-500/10 text-blue-300"
      : "border-amber-500/25 bg-amber-500/10 text-amber-300";
  return (
    <span className={`rounded-sm border px-2 py-1 font-data text-[10px] uppercase ${tone}`}>
      {label}
    </span>
  );
}

export default function ScoringTab() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlRaceId = searchParams.get("race") ?? searchParams.get("race_id") ?? "";
  const [championshipId, setChampionshipId] = useState(DEFAULT_CHAMPIONSHIP_ID);
  const [raceId, setRaceId] = useState(urlRaceId);
  const [limit, setLimit] = useState(500);
  const [mismatchesOnly, setMismatchesOnly] = useState(true);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [scoreType, setScoreType] = useState<ScoreType>(urlRaceId ? "official_race" : "all");
  const [ledgerQ, setLedgerQ] = useState("");
  const [ledgerRaceId, setLedgerRaceId] = useState(urlRaceId);
  const [ledgerUserId, setLedgerUserId] = useState("");
  const [ledgerLeagueId, setLedgerLeagueId] = useState("");

  useEffect(() => {
    if (!urlRaceId) return;
    setRaceId(urlRaceId);
    setLedgerRaceId(urlRaceId);
    setScoreType("official_race");
    setLedgerPage(0);
  }, [urlRaceId]);

  const params = {
    championship_id: championshipId.trim() || DEFAULT_CHAMPIONSHIP_ID,
    limit,
  };

  const ledgerParams = {
    score_type: scoreType,
    championship_id: params.championship_id,
    q: ledgerQ.trim() || undefined,
    race_id: ledgerRaceId.trim() || undefined,
    user_id: ledgerUserId.trim() || undefined,
    league_id: ledgerLeagueId.trim() || undefined,
    skip: ledgerPage * LEDGER_LIMIT,
    limit: LEDGER_LIMIT,
  };

  const { data, isLoading, isFetching, refetch } = useQuery<ReconciliationReport>({
    queryKey: ["admin-bo", "scoring", "reconciliation", params],
    queryFn: () => adminApi.scoring.reconciliation(params),
  });

  const { data: raceOptionsData = [] } = useQuery<RaceOption[]>({
    queryKey: ["admin-bo", "scoring", "races", params.championship_id],
    queryFn: () => adminApi.races.list({ championship_id: params.championship_id }),
  });

  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    isFetching: ledgerFetching,
  } = useQuery<ScoreLedgerResponse>({
    queryKey: ["admin-bo", "scoring", "ledger", ledgerParams],
    queryFn: () => adminApi.scoring.ledger(ledgerParams),
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      adminApi.scoring.applyReconciliation({
        championship_id: params.championship_id,
        confirm: "RECONCILE_SCORES",
        limit,
      }),
    onSuccess: (result: ReconciliationReport) => {
      toast.success(`${result.repaired ?? 0} ligne(s) de classement réparée(s)`);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "scoring"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "leagues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "championships"] });
    },
    onError: () => toast.error("Impossible d'appliquer la réconciliation"),
  });

  const rescoreMutation = useMutation({
    mutationFn: () => adminApi.scoring.rescoreRace(raceId.trim()),
    onSuccess: (result: { race_name?: string; predictions_processed?: number }) => {
      toast.success(`${result.predictions_processed ?? 0} pronostic(s) rescored`);
      setRaceId("");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "scoring"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "leagues"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Impossible de rescorrer la course";
      toast.error(message);
    },
  });

  const resyncAllMutation = useMutation({
    mutationFn: () => api.admin.resyncAllPast(),
    onSuccess: (result) => {
      const data = result as unknown as {
        message: string;
        results: { race: string; status: string; points?: number }[];
      };
      const summary = data.results
        .map((r) => `${r.race}: ${r.status} (${r.points ?? 0} pronos)`)
        .join(", ");
      toast.success(`${data.message} — ${summary}`);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "scoring"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "predictions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "leagues"] });
    },
    onError: () => toast.error("Impossible de resynchroniser les courses"),
  });

  const ledgerExportMutation = useMutation({
    mutationFn: () =>
      adminApi.scoring.ledgerExportCsv({
        score_type: scoreType,
        championship_id: params.championship_id,
        q: ledgerQ.trim() || undefined,
        race_id: ledgerRaceId.trim() || undefined,
        user_id: ledgerUserId.trim() || undefined,
        league_id: ledgerLeagueId.trim() || undefined,
        export_limit: 5000,
      }),
    onSuccess: (blob: Blob) => {
      downloadBlob(blob, "pronokif-scoring-ledger.csv");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      toast.success("Export CSV généré");
    },
    onError: () => toast.error("Export CSV impossible"),
  });

  const rows = useMemo(() => {
    const allRows = data?.rows ?? [];
    return mismatchesOnly ? allRows.filter((row) => row.delta !== 0 || !row.has_entry) : allRows;
  }, [data?.rows, mismatchesOnly]);

  const raceOptions = useMemo(
    () => (Array.isArray(raceOptionsData) ? raceOptionsData : []),
    [raceOptionsData],
  );
  const raceOptionsForControls = useMemo(() => {
    if (!urlRaceId || raceOptions.some((race) => race.id === urlRaceId)) return raceOptions;
    return [
      {
        id: urlRaceId,
        name: `Course ciblée (${urlRaceId})`,
        has_results: true,
      },
      ...raceOptions,
    ];
  }, [raceOptions, urlRaceId]);
  const rescoreRaceOptions = useMemo(
    () => raceOptionsForControls.filter((race) => race.has_results && !race.is_cancelled),
    [raceOptionsForControls],
  );

  const summary = data?.summary;
  const canApply = !!summary && (summary.mismatches > 0 || summary.missing_entries > 0);
  const ledgerScores = ledgerData?.scores ?? [];
  const ledgerSummary = ledgerData?.summary;
  const ledgerTotal = ledgerData?.total ?? 0;
  const canGoPrevious = ledgerPage > 0;
  const canGoNext = (ledgerPage + 1) * LEDGER_LIMIT < ledgerTotal;

  const handleApply = () => {
    if (!canApply || applyMutation.isPending) return;
    if (!confirm(`Réconcilier ${summary.mismatches} écart(s) pour ${params.championship_id} ?`))
      return;
    applyMutation.mutate();
  };

  const handleRescore = () => {
    const selectedRaceId = raceId.trim();
    if (!selectedRaceId || rescoreMutation.isPending) return;
    if (!confirm(`Relancer le scoring de ${selectedRaceId} ?`)) return;
    rescoreMutation.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Scores</h2>
          <p className="mt-1 font-body text-sm text-gray-500">
            Audit des classements depuis les journaux métier
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-300"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="scoring-refresh"
          >
            {isFetching ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Rafraîchir
          </Button>
          <Button
            type="button"
            size="sm"
            className="btn-racing text-xs"
            onClick={handleApply}
            disabled={!canApply || applyMutation.isPending}
            data-testid="scoring-apply"
          >
            {applyMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <DatabaseZap className="mr-1 h-4 w-4" />
            )}
            Réconcilier
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_160px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <Input
            value={championshipId}
            onChange={(e) => {
              setChampionshipId(e.target.value);
              setRaceId("");
              setLedgerRaceId("");
              setLedgerPage(0);
            }}
            className="bg-gray-950/60 pl-9 text-white"
            data-testid="scoring-championship-id"
          />
        </div>
        <Input
          type="number"
          min={1}
          max={5000}
          value={limit}
          onChange={(e) => setLimit(Math.min(Math.max(Number(e.target.value) || 1, 1), 5000))}
          className="bg-gray-950/60 text-white"
          data-testid="scoring-limit"
        />
        <label className="flex h-10 items-center gap-2 rounded-md border border-white/[0.08] bg-gray-950/40 px-3">
          <Switch checked={mismatchesOnly} onCheckedChange={setMismatchesOnly} />
          <span className="font-body text-xs text-gray-400">Écarts seuls</span>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Lignes" value={summary?.rows_count ?? 0} />
        <StatCard
          label="Écarts"
          value={summary?.mismatches ?? 0}
          tone={(summary?.mismatches ?? 0) > 0 ? "text-amber-300" : "text-emerald-300"}
        />
        <StatCard
          label="Entrées absentes"
          value={summary?.missing_entries ?? 0}
          tone={(summary?.missing_entries ?? 0) > 0 ? "text-red-300" : "text-emerald-300"}
        />
        <StatCard
          label="Delta +"
          value={`+${summary?.positive_delta ?? 0}`}
          tone="text-amber-300"
        />
        <StatCard label="Delta -" value={summary?.negative_delta ?? 0} tone="text-red-300" />
      </div>

      <div className="card-arcade border-l-4 border-pk-red p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
              Rescore course
            </p>
            <div className="mt-2">
              <select
                value={raceId}
                onChange={(e) => setRaceId(e.target.value)}
                className="h-10 w-full rounded-sm border border-white/[0.08] bg-gray-950/60 px-3 font-body text-sm text-white"
                data-testid="scoring-rescore-race-id"
              >
                <option value="">Sélectionner une course scorée</option>
                {rescoreRaceOptions.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.round_number ? `${race.round_number}. ` : ""}
                    {race.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 text-amber-300 hover:text-amber-200"
              onClick={handleRescore}
              disabled={!raceId.trim() || rescoreMutation.isPending}
              data-testid="scoring-rescore-race"
            >
              {rescoreMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-1 h-4 w-4" />
              )}
              Relancer
            </Button>
          </div>
        </div>
      </div>

      <div className="card-arcade border-l-4 border-amber-500 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
              Resync toutes les courses passées
            </p>
            <p className="mt-1 font-body text-xs text-gray-400">
              Re-fetch les résultats API + recalcule les scores de TOUTES les courses passées (après
              correction pilotes/scoring).
            </p>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 text-amber-300 hover:text-amber-200"
              onClick={() => {
                if (!confirm("Resynchroniser et rescorer TOUTES les courses passées ?")) return;
                resyncAllMutation.mutate();
              }}
              disabled={resyncAllMutation.isPending}
              data-testid="scoring-resync-all"
            >
              {resyncAllMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-1 h-4 w-4" />
              )}
              Resync tout
            </Button>
          </div>
        </div>
      </div>

      <div className="card-arcade overflow-hidden">
        <div className="border-b border-white/[0.08] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Journal scoring
              </p>
              <h3 className="mt-1 font-heading text-lg uppercase text-white">Scores persistés</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-gray-300 hover:text-white"
              onClick={() => ledgerExportMutation.mutate()}
              disabled={ledgerExportMutation.isPending}
              data-testid="scoring-ledger-export"
            >
              {ledgerExportMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1 h-4 w-4" />
              )}
              Export CSV
            </Button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_1fr_1fr_1fr]">
            <select
              value={scoreType}
              onChange={(event) => {
                setScoreType(event.target.value as ScoreType);
                setLedgerPage(0);
              }}
              className="h-10 rounded-sm border border-white/[0.08] bg-gray-950/60 px-3 font-body text-sm text-white"
              data-testid="scoring-ledger-type"
            >
              <option value="all">Tous scores</option>
              <option value="official_race">Officiels</option>
              <option value="custom_prediction">Custom</option>
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
              <Input
                value={ledgerQ}
                onChange={(event) => {
                  setLedgerQ(event.target.value);
                  setLedgerPage(0);
                }}
                placeholder="Recherche"
                className="bg-gray-950/60 pl-9 text-white"
                data-testid="scoring-ledger-search"
              />
            </div>
            <select
              value={ledgerRaceId}
              onChange={(event) => {
                setLedgerRaceId(event.target.value);
                setLedgerPage(0);
              }}
              className="h-10 rounded-sm border border-white/[0.08] bg-gray-950/60 px-3 font-body text-sm text-white"
              data-testid="scoring-ledger-race"
            >
              <option value="">Toutes courses</option>
              {raceOptionsForControls.map((race) => (
                <option key={race.id} value={race.id}>
                  {race.round_number ? `${race.round_number}. ` : ""}
                  {race.name}
                </option>
              ))}
            </select>
            <Input
              value={ledgerUserId}
              onChange={(event) => {
                setLedgerUserId(event.target.value);
                setLedgerPage(0);
              }}
              placeholder="user_id"
              className="bg-gray-950/60 font-data text-white"
              data-testid="scoring-ledger-user"
            />
            <Input
              value={ledgerLeagueId}
              onChange={(event) => {
                setLedgerLeagueId(event.target.value);
                setLedgerPage(0);
              }}
              placeholder="league_id"
              className="bg-gray-950/60 font-data text-white"
              data-testid="scoring-ledger-league"
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-5">
            <StatCard label="Scores" value={ledgerSummary?.total_rows ?? 0} />
            <StatCard
              label="Officiels"
              value={ledgerSummary?.official_rows ?? 0}
              tone="text-blue-300"
            />
            <StatCard
              label="Custom"
              value={ledgerSummary?.custom_rows ?? 0}
              tone="text-amber-300"
            />
            <StatCard
              label="Points"
              value={ledgerSummary?.points_total ?? 0}
              tone="text-emerald-300"
            />
            <StatCard label="XP" value={ledgerSummary?.xp_total ?? 0} tone="text-purple-300" />
          </div>
        </div>

        {ledgerLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-pk-red" />
          </div>
        ) : ledgerScores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-gray-500" />
            <p className="font-heading text-sm uppercase text-white">Aucun score</p>
            <p className="mt-1 font-body text-sm text-gray-500">
              Aucune ligne ne correspond aux filtres.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] font-data text-[10px] uppercase tracking-[0.14em] text-gray-500">
                <tr>
                  <th className="p-3">Source</th>
                  <th className="p-3">Objet</th>
                  <th className="p-3">Joueur</th>
                  <th className="p-3">Contexte</th>
                  <th className="p-3 text-right">Points</th>
                  <th className="p-3 text-right">XP</th>
                  <th className="p-3">Scoré</th>
                  <th className="p-3">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {ledgerScores.map((score) => (
                  <tr key={score.id} className="hover:bg-white/[0.03]">
                    <td className="p-3">
                      <SourceBadge source={score.source} />
                    </td>
                    <td className="max-w-[260px] p-3">
                      <p className="truncate font-body text-sm text-white">
                        {score.title || score.prediction_id || "—"}
                      </p>
                      <p className="mt-1 truncate font-data text-[10px] text-gray-600">
                        {score.prediction_id || score.id}
                      </p>
                    </td>
                    <td className="p-3">
                      <UserIdentity
                        user={{
                          id: score.user_id,
                          username: score.user_username,
                          email: score.user_email,
                          avatar_id: score.user_avatar_id,
                          custom_avatar_url: score.user_custom_avatar_url,
                        }}
                        surface="admin"
                        size="sm"
                        showEmail
                        className="max-w-[240px]"
                        data-testid={`admin-score-user-${score.id}`}
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-body text-xs text-gray-300">
                        {score.race_name ||
                          score.race_id ||
                          score.league_name ||
                          score.league_id ||
                          "—"}
                      </p>
                      <p className="mt-1 font-data text-[10px] text-gray-600">
                        {score.league_id || score.race_id || "—"}
                      </p>
                    </td>
                    <td className="p-3 text-right font-data text-sm tabular-nums text-emerald-300">
                      {score.points}
                    </td>
                    <td className="p-3 text-right font-data text-sm tabular-nums text-purple-300">
                      {score.xp_awarded}
                    </td>
                    <td className="p-3">
                      <p className="font-body text-xs text-gray-300">
                        {formatDateTime(score.scored_at)}
                      </p>
                      <p className="mt-1 font-data text-[10px] text-gray-600">
                        {score.scored_by || "—"}
                      </p>
                    </td>
                    <td className="max-w-[260px] p-3">
                      <p className="truncate font-body text-xs text-gray-400">
                        {formatCompactValue(score.details?.[0])}
                      </p>
                      {score.is_correct !== undefined ? (
                        <p
                          className={
                            score.is_correct
                              ? "mt-1 font-data text-[10px] text-emerald-300"
                              : "mt-1 font-data text-[10px] text-red-300"
                          }
                        >
                          {score.is_correct ? "Correct" : "Incorrect"}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3">
          <p className="font-data text-xs text-gray-500">
            {ledgerFetching
              ? "Synchronisation..."
              : `${ledgerScores.length} / ${ledgerTotal} ligne(s)`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canGoPrevious}
              onClick={() => setLedgerPage((current) => Math.max(current - 1, 0))}
              className="text-xs text-gray-300"
            >
              Précédent
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canGoNext}
              onClick={() => setLedgerPage((current) => current + 1)}
              className="text-xs text-gray-300"
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>

      <div className="card-arcade overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-pk-red" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="mb-3 h-10 w-10 text-emerald-400" />
            <p className="font-heading text-sm uppercase text-white">Classements alignés</p>
            <p className="mt-1 font-body text-sm text-gray-500">
              Aucun écart détecté sur ce périmètre.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/[0.08] bg-white/[0.02] font-data text-[10px] uppercase tracking-[0.14em] text-gray-500">
                <tr>
                  <th className="p-3">Ligue</th>
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3 text-right">Actuel</th>
                  <th className="p-3 text-right">Attendu</th>
                  <th className="p-3 text-right">Officiel</th>
                  <th className="p-3 text-right">Custom</th>
                  <th className="p-3">Delta</th>
                  <th className="p-3">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.slice(0, 200).map((row) => (
                  <tr key={`${row.league_id}-${row.user_id}`} className="hover:bg-white/[0.03]">
                    <td className="p-3 font-data text-xs text-gray-300">{row.league_id}</td>
                    <td className="p-3 font-data text-xs text-white">{row.user_id}</td>
                    <td className="p-3 text-right font-data text-sm tabular-nums text-gray-400">
                      {row.current_total}
                    </td>
                    <td className="p-3 text-right font-data text-sm tabular-nums text-white">
                      {row.expected_total}
                    </td>
                    <td className="p-3 text-right font-data text-sm tabular-nums text-gray-400">
                      {row.official_points}
                    </td>
                    <td className="p-3 text-right font-data text-sm tabular-nums text-gray-400">
                      {row.custom_points}
                    </td>
                    <td className="p-3">
                      <DeltaBadge delta={row.delta} />
                    </td>
                    <td className="p-3">
                      {row.has_entry ? (
                        <span className="font-body text-xs text-gray-500">Entrée existante</span>
                      ) : (
                        <span className="font-body text-xs text-red-300">Entrée absente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
