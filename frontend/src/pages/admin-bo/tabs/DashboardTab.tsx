/**
 * Admin Dashboard — overview stats.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Eye,
  Flag,
  Gauge,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { DateEntityToken, RaceEntityToken } from "@/components/entities/RaceEntityToken";
import { UserIdentity } from "@/components/users/UserIdentity";

type AdminTabKey =
  | "dashboard"
  | "users"
  | "predictions"
  | "scoring"
  | "leagues"
  | "championships"
  | "races"
  | "feedbacks"
  | "invitations"
  | "activity"
  | "knowledge"
  | "legal";

type DashboardTabProps = {
  onNavigate?: (tab: AdminTabKey, entityId?: string | null) => void;
};

type BusinessActionItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  area: string;
  title: string;
  description: string;
  target_tab: AdminTabKey;
  entity_id?: string | null;
  metric?: number | string | null;
};

type BusinessRace = {
  id: string;
  name: string;
  round_number?: number;
  status?: string;
  is_cancelled?: boolean;
  predictions_close_at?: string | null;
  content_status?: string;
  completion_rate?: number;
  missing_predictions?: number;
  has_results?: boolean;
  scoring_pending?: number;
};

type BusinessOperations = {
  summary: {
    business_score: number;
    attention_count: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
  };
  generated_at: string;
  action_items: BusinessActionItem[];
  next_races: BusinessRace[];
  metrics: Record<string, number>;
};

type DashboardRecentUser = {
  id?: string;
  username?: string | null;
  email?: string | null;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  created_at?: string;
  last_login_at?: string | null;
  last_prediction_at?: string | null;
  level?: number | null;
  is_banned?: boolean;
  email_verified?: boolean;
  predictions_count?: number;
  leagues_count?: number;
};

type DashboardRecentPrediction = {
  id?: string;
  user_id?: string;
  user_email?: string | null;
  user_username?: string | null;
  user_avatar_id?: string | null;
  user_custom_avatar_url?: string | null;
  race_id?: string;
  race_name?: string | null;
  race_date?: string | null;
  created_at?: string;
  updated_at?: string;
  main_updated_at?: string;
  sprint_updated_at?: string;
  submitted_at?: string | null;
  is_complete?: boolean;
  locked?: boolean;
  score_total?: number | null;
};

const cardStyles = {
  primary: {
    border: "border-l-pk-red",
    icon: "text-pk-red",
    chip: "border-pk-red/20 bg-pk-red-subtle",
    hover: "hover:border-pk-red/30 hover:shadow-[0_12px_32px_rgba(225,6,0,0.12)]",
  },
  neutral: {
    border: "border-l-white/[0.12]",
    icon: "text-pk-piste",
    chip: "border-white/[0.08] bg-white/[0.04]",
    hover: "hover:border-white/[0.16]",
  },
  success: {
    border: "border-l-pk-emerald",
    icon: "text-pk-emerald",
    chip: "border-pk-emerald/20 bg-pk-emerald/[0.08]",
    hover: "hover:border-pk-emerald/25 hover:shadow-[0_12px_32px_rgba(16,185,129,0.08)]",
  },
  warning: {
    border: "border-l-pk-amber",
    icon: "text-pk-amber",
    chip: "border-pk-amber/25 bg-pk-amber/[0.08]",
    hover: "hover:border-pk-amber/25 hover:shadow-[0_12px_32px_rgba(245,158,11,0.08)]",
  },
  danger: {
    border: "border-l-pk-red",
    icon: "text-pk-red",
    chip: "border-pk-red/25 bg-pk-red-subtle",
    hover: "hover:border-pk-red/35 hover:shadow-[0_12px_32px_rgba(225,6,0,0.12)]",
  },
} as const;

type DashboardMetricTone = keyof typeof cardStyles;

function formatDateTime(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityClass(severity: BusinessActionItem["severity"]) {
  if (severity === "critical") return "border-pk-red/30 bg-pk-red-subtle text-pk-red";
  if (severity === "warning") return "border-pk-amber/30 bg-pk-amber/[0.08] text-pk-amber";
  return "border-white/[0.1] bg-white/[0.04] text-pk-piste";
}

function scoreTone(score: number) {
  if (score >= 80) return "text-pk-emerald";
  if (score >= 55) return "text-pk-amber";
  return "text-pk-red";
}

function raceStatusLabel(status?: string) {
  if (status === "in_progress") return "live";
  if (status === "finished") return "à traiter";
  return "à venir";
}

function raceStatusClass(status?: string) {
  if (status === "in_progress") return "text-pk-red";
  if (status === "finished") return "text-pk-amber";
  return "text-pk-emerald";
}

function raceResultLabel(race: BusinessRace) {
  if (race.status !== "finished") return "pré-course";
  return race.has_results ? "résultats OK" : "résultats manquants";
}

function predictionSubmittedAt(prediction: DashboardRecentPrediction) {
  return (
    prediction.submitted_at ??
    prediction.updated_at ??
    prediction.main_updated_at ??
    prediction.sprint_updated_at ??
    prediction.created_at
  );
}

function formatCompactCount(value: unknown, singular: string, plural: string) {
  const count = Number(value ?? 0);
  return `${count} ${count > 1 ? plural : singular}`;
}

function adminPredictionsHref(filters: Record<string, string>) {
  const params = new URLSearchParams({ tab: "predictions", ...filters });
  return `/admin?${params.toString()}`;
}

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-bo", "stats"],
    queryFn: () => adminApi.stats(),
    refetchInterval: 30_000,
  });
  const { data: operations, isLoading: operationsLoading } = useQuery<BusinessOperations>({
    queryKey: ["admin-bo", "business", "operations"],
    queryFn: () => adminApi.business.operations(),
    refetchInterval: 30_000,
  });

  const seedDemoMutation = useMutation({
    mutationFn: () => adminApi.demo.seed(),
    onSuccess: (data) => {
      toast.success(
        `Démo synchronisée : ${data.summary?.users ?? 0} utilisateurs, ${data.summary?.predictions ?? 0} pronostics`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-bo"] });
    },
    onError: () => toast.error("Synchronisation démo impossible"),
  });

  const handleSeedDemo = () => {
    if (!confirm("Synchroniser le jeu de données démo complet ?")) return;
    seedDemoMutation.mutate();
  };

  const cards: Array<{
    label: string;
    value: number | string;
    icon: typeof Users;
    tone: DashboardMetricTone;
    target: AdminTabKey;
  }> = [
    {
      label: "Utilisateurs",
      value: stats?.total_users ?? "—",
      icon: Users,
      tone: "neutral",
      target: "users",
    },
    {
      label: "Pronostics",
      value: stats?.total_predictions ?? "—",
      icon: TrendingUp,
      tone: "primary",
      target: "predictions",
    },
    {
      label: "Ligues",
      value: stats?.total_leagues ?? "—",
      icon: Trophy,
      tone: "success",
      target: "leagues",
    },
    {
      label: "Courses",
      value: stats?.total_races ?? "—",
      icon: Flag,
      tone: "neutral",
      target: "races",
    },
    {
      label: "Retours non lus",
      value: stats?.unread_feedbacks ?? "—",
      icon: MessageSquare,
      tone: "warning",
      target: "feedbacks",
    },
    {
      label: "Invitations en attente",
      value: stats?.pending_invitations ?? "—",
      icon: Mail,
      tone: "danger",
      target: "invitations",
    },
    {
      label: "Actions admin",
      value: stats?.total_activity_logs ?? "—",
      icon: Activity,
      tone: "neutral",
      target: "activity",
    },
  ];
  const operationSummary = operations?.summary ?? {
    business_score: 0,
    attention_count: 0,
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
  };
  const actionItems = operations?.action_items ?? [];
  const nextRaces = operations?.next_races ?? [];
  const recentUsers = (stats?.recent_users ?? []) as DashboardRecentUser[];
  const recentPredictions = (stats?.recent_predictions ?? []) as DashboardRecentPrediction[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-red">
            Back office
          </p>
          <h2 className="font-heading text-2xl text-white uppercase tracking-tight">
            Tableau de bord
          </h2>
        </div>
        <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
          Pilotage live
        </p>
      </div>

      <section className="card-arcade mb-6 overflow-hidden border-l-4 border-pk-red">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-pk-red/25 bg-pk-red/10">
              <Gauge className="h-5 w-5 text-pk-red" />
            </div>
            <div>
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-red">
                Cockpit exploitation
              </p>
              <h3 className="font-heading text-lg uppercase text-white">Priorités métier</h3>
            </div>
          </div>
          {operationsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-pk-red" />
          ) : (
            <div className="text-right">
              <p
                className={`font-data text-3xl tabular-nums ${scoreTone(operationSummary.business_score)}`}
              >
                {operationSummary.business_score}
              </p>
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                score métier
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-sm border border-pk-red/25 bg-pk-red-subtle px-2 py-1 font-data text-xs text-pk-red">
                {operationSummary.critical_count} critique
              </span>
              <span className="rounded-sm border border-pk-amber/25 bg-pk-amber/[0.08] px-2 py-1 font-data text-xs text-pk-amber">
                {operationSummary.warning_count} warning
              </span>
              <span className="rounded-sm border border-white/[0.1] bg-white/[0.04] px-2 py-1 font-data text-xs text-pk-piste">
                {operationSummary.info_count} info
              </span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {actionItems.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.target_tab, item.entity_id)}
                  className="group flex w-full items-start justify-between gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-white/[0.035]"
                  data-testid={`dashboard-business-action-${item.id}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 rounded-sm border px-2 py-1 font-data text-[10px] uppercase ${severityClass(item.severity)}`}
                    >
                      {item.severity === "critical" ? "critique" : item.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-white">{item.title}</p>
                      <p className="mt-1 font-body text-xs leading-5 text-pk-titane">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-pk-titane transition-transform group-hover:translate-x-0.5 group-hover:text-pk-piste" />
                </button>
              ))}
              {!operationsLoading && actionItems.length === 0 && (
                <div className="flex items-center gap-3 py-6">
                  <CheckCircle2 className="h-5 w-5 text-pk-emerald" />
                  <p className="font-body text-sm text-pk-piste">
                    Aucune priorité bloquante détectée.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/[0.08] p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-pk-amber" />
              <h4 className="font-heading text-sm uppercase text-white">GP à surveiller</h4>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {nextRaces.slice(0, 5).map((race) => (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => onNavigate?.("races", race.id)}
                  className="w-full py-3 text-left"
                  data-testid={`dashboard-next-race-${race.id}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-body text-sm text-white">
                      {race.round_number ? `${race.round_number}. ` : ""}
                      {race.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`font-data text-[10px] uppercase tracking-[0.12em] ${raceStatusClass(race.status)}`}
                      >
                        {raceStatusLabel(race.status)}
                      </span>
                      <span className="font-data text-xs text-pk-amber">
                        {race.completion_rate ?? 0}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 font-body text-[11px] text-pk-titane">
                    {race.missing_predictions ?? 0} à relancer · {race.scoring_pending ?? 0} scoring
                    · {raceResultLabel(race)} · {String(race.content_status ?? "draft")}
                  </p>
                </button>
              ))}
              {!operationsLoading && nextRaces.length === 0 && (
                <p className="py-6 font-body text-sm text-pk-titane">
                  Aucun GP actif à surveiller.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="mb-6 overflow-x-auto pb-1">
          <div className="grid min-w-[980px] grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-[88px] rounded-md border border-white/[0.06] bg-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 overflow-x-auto pb-1" data-testid="dashboard-kpi-row">
            <div className="grid min-w-[980px] grid-cols-7 gap-3">
              {cards.map(({ label, value, icon: Icon, tone, target }) => {
                const styles = cardStyles[tone];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onNavigate?.(target)}
                    className={`card-arcade group min-h-[88px] border-l-4 p-3 ${styles.border} text-left transition-all hover:-translate-y-0.5 ${styles.hover}`}
                    data-testid={`dashboard-card-${target}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${styles.chip}`}
                      >
                        <Icon className={`h-4 w-4 ${styles.icon}`} />
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-pk-titane transition-transform group-hover:translate-x-0.5 group-hover:text-pk-piste" />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="font-data text-2xl leading-none text-white tabular-nums">
                        {value}
                      </p>
                      <p className="min-w-0 flex-1 text-right font-data text-[9px] uppercase leading-tight tracking-[0.12em] text-pk-titane">
                        {label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <section
              className="card-arcade overflow-hidden border-l-4 border-l-pk-emerald"
              data-testid="dashboard-latest-users"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-pk-emerald/20 bg-pk-emerald/[0.08]">
                    <UserPlus className="h-4 w-4 text-pk-emerald" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-emerald">
                      Acquisition
                    </p>
                    <h3 className="font-heading text-sm uppercase text-pk-piste">
                      Derniers inscrits
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.("users")}
                  className="shrink-0 rounded-sm border border-white/[0.08] px-2 py-1 font-data text-[10px] uppercase tracking-[0.12em] text-pk-titane transition-colors hover:border-pk-emerald/25 hover:text-pk-piste"
                >
                  {stats?.new_users_week ?? 0} / 7j
                </button>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {recentUsers.slice(0, 6).map((user) => (
                  <div
                    key={String(user.id ?? user.email)}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                  >
                    <UserIdentity
                      user={{
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        avatar_id: user.avatar_id,
                        custom_avatar_url: user.custom_avatar_url,
                        level: user.level,
                      }}
                      surface="admin"
                      size="sm"
                      showEmail
                      className="max-w-full"
                      data-testid={`dashboard-latest-user-${user.id ?? user.email}`}
                    />
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <span
                        className={`rounded-sm px-2 py-1 font-data text-[10px] uppercase ${
                          Number(user.predictions_count ?? 0) > 0
                            ? "bg-pk-emerald/[0.12] text-pk-emerald"
                            : "bg-pk-amber/[0.12] text-pk-amber"
                        }`}
                      >
                        {formatCompactCount(user.predictions_count, "prono", "pronos")}
                      </span>
                      <span className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-1 font-data text-[10px] uppercase text-pk-titane">
                        {formatCompactCount(user.leagues_count, "ligue", "ligues")}
                      </span>
                      {user.email_verified === false ? (
                        <span className="rounded-sm border border-pk-amber/25 bg-pk-amber/[0.08] px-2 py-1 font-data text-[10px] uppercase text-pk-amber">
                          email
                        </span>
                      ) : null}
                      {user.is_banned ? (
                        <span className="rounded-sm border border-pk-red/25 bg-pk-red-subtle px-2 py-1 font-data text-[10px] uppercase text-pk-red">
                          banni
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-2 md:justify-end">
                      <div className="text-left md:text-right">
                        <p className="font-data text-[9px] uppercase tracking-[0.12em] text-pk-titane">
                          inscrit
                        </p>
                        <p className="font-data text-[10px] uppercase tracking-[0.12em] text-pk-piste">
                          {formatDateTime(user.created_at)}
                        </p>
                        {user.last_prediction_at ? (
                          <p className="mt-1 font-body text-[11px] text-pk-titane">
                            dépôt {formatDateTime(user.last_prediction_at)}
                          </p>
                        ) : null}
                      </div>
                      {user.id ? (
                        <Link
                          to={`/admin?tab=users&user=${encodeURIComponent(user.id)}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/[0.08] text-pk-titane transition-colors hover:border-pk-emerald/25 hover:text-pk-piste focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-emerald/40"
                          aria-label="Ouvrir la fiche du joueur"
                          title="Ouvrir la fiche du joueur"
                          data-testid={`dashboard-latest-user-open-${user.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
                {recentUsers.length === 0 && (
                  <p className="px-4 py-6 font-body text-sm text-pk-titane">
                    Aucun nouvel inscrit pour l’instant.
                  </p>
                )}
              </div>
            </section>

            <section
              className="card-arcade overflow-hidden border-l-4 border-l-pk-red"
              data-testid="dashboard-latest-predictions"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-pk-red/25 bg-pk-red-subtle">
                    <ClipboardCheck className="h-4 w-4 text-pk-red" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-red">
                      Pronostics
                    </p>
                    <h3 className="font-heading text-sm uppercase text-pk-piste">
                      Derniers dépôts
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.("predictions")}
                  className="group inline-flex shrink-0 items-center gap-1 rounded-sm border border-white/[0.08] px-2 py-1 font-data text-[10px] uppercase tracking-[0.12em] text-pk-titane transition-colors hover:border-pk-red/30 hover:text-pk-piste"
                >
                  voir
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {recentPredictions.slice(0, 6).map((prediction) => (
                  <div
                    key={String(prediction.id ?? `${prediction.user_id}-${prediction.race_id}`)}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] md:items-center"
                  >
                    <UserIdentity
                      user={{
                        id: prediction.user_id,
                        username: prediction.user_username,
                        email: prediction.user_email,
                        avatar_id: prediction.user_avatar_id,
                        custom_avatar_url: prediction.user_custom_avatar_url,
                      }}
                      surface="admin"
                      size="sm"
                      showEmail
                      className="max-w-full"
                      data-testid={`dashboard-latest-prediction-user-${prediction.id ?? prediction.user_id}`}
                    />
                    <div className="min-w-0">
                      <RaceEntityToken
                        raceId={prediction.race_id}
                        raceName={prediction.race_name}
                        href={prediction.race_id ? `/race/${prediction.race_id}` : undefined}
                        className="max-w-full font-display text-xs tracking-normal"
                      />
                      <p className="mt-1 font-body text-[11px] text-pk-titane">
                        <DateEntityToken
                          value={prediction.race_date}
                          href={prediction.race_id ? `/race/${prediction.race_id}` : undefined}
                        />
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:block md:text-right">
                      <span
                        className={`rounded-sm px-2 py-1 font-data text-[10px] uppercase ${
                          prediction.is_complete
                            ? "bg-pk-emerald/[0.12] text-pk-emerald"
                            : "bg-pk-amber/[0.12] text-pk-amber"
                        }`}
                      >
                        {prediction.is_complete ? "complet" : "incomplet"}
                      </span>
                      <p className="mt-0 md:mt-2 font-data text-[10px] uppercase tracking-[0.12em] text-pk-titane">
                        {formatDateTime(predictionSubmittedAt(prediction))}
                      </p>
                    </div>
                    {prediction.id ? (
                      <Link
                        to={`/admin?tab=predictions&prediction=${encodeURIComponent(prediction.id)}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/[0.08] text-pk-titane transition-colors hover:border-pk-red/30 hover:text-pk-piste focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
                        aria-label="Ouvrir la fiche du pronostic"
                        title="Ouvrir la fiche du pronostic"
                        data-testid={`dashboard-latest-prediction-open-${prediction.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    ) : null}
                  </div>
                ))}
                {recentPredictions.length === 0 && (
                  <p className="px-4 py-6 font-body text-sm text-pk-titane">
                    Aucun pronostic déposé pour l’instant.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-arcade p-4">
              <h3 className="mb-3 font-heading text-sm uppercase text-pk-piste">
                Santé pronostics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={adminPredictionsHref({ submitted_window: "7d" })}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-pk-red/30 hover:bg-pk-red-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
                  aria-label="Voir les pronostics déposés sur 7 jours"
                  data-testid="dashboard-health-week-predictions"
                >
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                    7 jours
                  </p>
                  <p className="mt-1 font-data text-xl text-pk-red">
                    {stats?.predictions_week ?? 0}
                  </p>
                </Link>
                <Link
                  to={adminPredictionsHref({ submitted_window: "24h" })}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  aria-label="Voir les pronostics déposés sur 24h"
                  data-testid="dashboard-health-day-predictions"
                >
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                    24h
                  </p>
                  <p className="mt-1 font-data text-xl text-pk-piste">
                    {stats?.predictions_day ?? 0}
                  </p>
                </Link>
                <Link
                  to={adminPredictionsHref({ locked: "locked" })}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-pk-red/30 hover:bg-pk-red-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
                  aria-label="Voir les pronostics verrouillés"
                  data-testid="dashboard-health-locked-predictions"
                >
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                    Verrouillés
                  </p>
                  <p className="mt-1 font-data text-xl text-pk-red">
                    {stats?.locked_predictions ?? 0}
                  </p>
                </Link>
                <Link
                  to={adminPredictionsHref({ review_status: "attention" })}
                  className="rounded-md border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-pk-amber/30 hover:bg-pk-amber/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-amber/40"
                  aria-label="Voir les pronostics à revoir"
                  data-testid="dashboard-health-review-predictions"
                >
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
                    À revoir
                  </p>
                  <p className="mt-1 font-data text-xl text-pk-amber">
                    {stats?.predictions_to_review ?? 0}
                  </p>
                </Link>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.("activity")}
              className="card-arcade p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/[0.16]"
              data-testid="dashboard-card-recent-activity"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-sm uppercase text-pk-piste">Derniers logs</h3>
                <ArrowRight className="h-4 w-4 text-pk-titane" />
              </div>
              <div className="space-y-2">
                {(stats?.recent_activity_logs ?? [])
                  .slice(0, 4)
                  .map((log: Record<string, unknown>) => (
                    <div
                      key={String(log.id)}
                      className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
                    >
                      <p className="font-body text-sm text-pk-piste">
                        {String(log.action ?? "activité")}
                      </p>
                      <p className="font-body text-[11px] text-pk-titane">
                        {String(log.actor_email ?? "admin")} · {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  ))}
                {(stats?.recent_activity_logs ?? []).length === 0 && (
                  <p className="font-body text-xs text-pk-titane">
                    Aucun log admin pour l’instant.
                  </p>
                )}
              </div>
            </button>
          </div>

          <div className="card-arcade p-4 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md border border-pk-red/25 bg-pk-red/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-pk-red" />
                </div>
                <div>
                  <h3 className="font-heading text-sm text-white uppercase">Données démo</h3>
                  <p className="font-body text-xs text-pk-titane">
                    Calendrier, résultats, ligues, pronostics, médias et compteurs.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="btn-racing text-xs"
                onClick={handleSeedDemo}
                disabled={seedDemoMutation.isPending}
              >
                {seedDemoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1" />
                )}
                Seed demo complet
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
