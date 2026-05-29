/**
 * Admin Dashboard — overview stats.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Flag,
  Gauge,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";

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
  onNavigate?: (tab: AdminTabKey) => void;
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
  predictions_close_at?: string | null;
  content_status?: string;
  completion_rate?: number;
  missing_predictions?: number;
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

const cardStyles = {
  cyan: {
    border: "border-cyan-500",
    icon: "text-cyan-400",
    hover: "hover:border-cyan-400/80 hover:shadow-cyan-500/10",
  },
  orange: {
    border: "border-orange-500",
    icon: "text-orange-400",
    hover: "hover:border-orange-400/80 hover:shadow-orange-500/10",
  },
  purple: {
    border: "border-purple-500",
    icon: "text-purple-400",
    hover: "hover:border-purple-400/80 hover:shadow-purple-500/10",
  },
  green: {
    border: "border-green-500",
    icon: "text-green-400",
    hover: "hover:border-green-400/80 hover:shadow-green-500/10",
  },
  yellow: {
    border: "border-yellow-500",
    icon: "text-yellow-400",
    hover: "hover:border-yellow-400/80 hover:shadow-yellow-500/10",
  },
  red: {
    border: "border-red-500",
    icon: "text-red-400",
    hover: "hover:border-red-400/80 hover:shadow-red-500/10",
  },
} as const;

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
  if (severity === "critical") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (severity === "warning") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  return "border-cyan-500/25 bg-cyan-500/10 text-cyan-300";
}

function scoreTone(score: number) {
  if (score >= 80) return "text-green-300";
  if (score >= 55) return "text-yellow-300";
  return "text-red-300";
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
    color: keyof typeof cardStyles;
    target: AdminTabKey;
  }> = [
    {
      label: "Utilisateurs",
      value: stats?.total_users ?? "—",
      icon: Users,
      color: "cyan",
      target: "users",
    },
    {
      label: "Pickstics",
      value: stats?.total_predictions ?? "—",
      icon: TrendingUp,
      color: "orange",
      target: "predictions",
    },
    {
      label: "Ligues",
      value: stats?.total_leagues ?? "—",
      icon: Trophy,
      color: "purple",
      target: "leagues",
    },
    {
      label: "Courses",
      value: stats?.total_races ?? "—",
      icon: Flag,
      color: "green",
      target: "races",
    },
    {
      label: "Retours non lus",
      value: stats?.unread_feedbacks ?? "—",
      icon: MessageSquare,
      color: "yellow",
      target: "feedbacks",
    },
    {
      label: "Invitations en attente",
      value: stats?.pending_invitations ?? "—",
      icon: Mail,
      color: "red",
      target: "invitations",
    },
    {
      label: "Actions admin",
      value: stats?.total_activity_logs ?? "—",
      icon: Activity,
      color: "cyan",
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

  return (
    <div>
      <h2 className="font-heading text-2xl text-white uppercase tracking-tight mb-6">
        Tableau de bord
      </h2>

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
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                score métier
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-sm border border-red-500/25 bg-red-500/10 px-2 py-1 font-data text-xs text-red-300">
                {operationSummary.critical_count} critique
              </span>
              <span className="rounded-sm border border-yellow-500/25 bg-yellow-500/10 px-2 py-1 font-data text-xs text-yellow-300">
                {operationSummary.warning_count} warning
              </span>
              <span className="rounded-sm border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 font-data text-xs text-cyan-300">
                {operationSummary.info_count} info
              </span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {actionItems.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.target_tab)}
                  className="group flex w-full items-start justify-between gap-3 py-3 text-left"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 rounded-sm border px-2 py-1 font-data text-[10px] uppercase ${severityClass(item.severity)}`}
                    >
                      {item.severity === "critical" ? "critique" : item.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-white">{item.title}</p>
                      <p className="mt-1 font-body text-xs leading-5 text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-300" />
                </button>
              ))}
              {!operationsLoading && actionItems.length === 0 && (
                <div className="flex items-center gap-3 py-6">
                  <CheckCircle2 className="h-5 w-5 text-green-300" />
                  <p className="font-body text-sm text-gray-300">
                    Aucune priorité bloquante détectée.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/[0.08] p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-300" />
              <h4 className="font-heading text-sm uppercase text-white">Prochains GP</h4>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {nextRaces.slice(0, 5).map((race) => (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => onNavigate?.("races")}
                  className="w-full py-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-body text-sm text-white">
                      {race.round_number ? `${race.round_number}. ` : ""}
                      {race.name}
                    </p>
                    <span className="font-data text-xs text-orange-300">
                      {race.completion_rate ?? 0}%
                    </span>
                  </div>
                  <p className="mt-1 font-body text-[11px] text-gray-500">
                    {race.missing_predictions ?? 0} à relancer · {race.scoring_pending ?? 0} scoring
                    · {String(race.content_status ?? "draft")}
                  </p>
                </button>
              ))}
              {!operationsLoading && nextRaces.length === 0 && (
                <p className="py-6 font-body text-sm text-gray-500">Aucun GP actif à surveiller.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-800/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {cards.map(({ label, value, icon: Icon, color, target }) => {
              const styles = cardStyles[color];
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onNavigate?.(target)}
                  className={`card-arcade group p-4 border-l-4 ${styles.border} text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${styles.hover}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-5 h-5 ${styles.icon}`} />
                    <ArrowRight className="h-4 w-4 text-gray-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-300" />
                  </div>
                  <p className="font-data text-2xl text-white">{value}</p>
                  <p className="font-body text-xs text-gray-500">{label}</p>
                </button>
              );
            })}
          </div>

          {stats?.new_users_week !== undefined && (
            <div className="card-arcade p-4">
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-2">
                Activité récente
              </h3>
              <p className="font-body text-gray-300">
                <span className="text-cyan-400 font-data text-lg">{stats.new_users_week}</span>{" "}
                nouveaux utilisateurs cette semaine
              </p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card-arcade p-4">
              <h3 className="mb-3 font-heading text-sm uppercase text-gray-400">
                Santé pronostics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    7 jours
                  </p>
                  <p className="mt-1 font-data text-xl text-orange-400">
                    {stats?.predictions_week ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    24h
                  </p>
                  <p className="mt-1 font-data text-xl text-cyan-400">
                    {stats?.predictions_day ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    Verrouillés
                  </p>
                  <p className="mt-1 font-data text-xl text-red-400">
                    {stats?.locked_predictions ?? 0}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                    À revoir
                  </p>
                  <p className="mt-1 font-data text-xl text-yellow-400">
                    {stats?.predictions_to_review ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.("activity")}
              className="card-arcade p-4 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-400/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-sm uppercase text-gray-400">Derniers logs</h3>
                <ArrowRight className="h-4 w-4 text-gray-600" />
              </div>
              <div className="space-y-2">
                {(stats?.recent_activity_logs ?? [])
                  .slice(0, 4)
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
                {(stats?.recent_activity_logs ?? []).length === 0 && (
                  <p className="font-body text-xs text-gray-500">Aucun log admin pour l’instant.</p>
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
                  <p className="font-body text-xs text-gray-500">
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
