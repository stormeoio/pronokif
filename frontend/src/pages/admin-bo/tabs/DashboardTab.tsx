/**
 * Admin Dashboard — overview stats.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Database,
  Flag,
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

type AdminTabKey = "users" | "predictions" | "leagues" | "races" | "feedbacks" | "invitations";

type DashboardTabProps = {
  onNavigate?: (tab: AdminTabKey) => void;
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

export default function DashboardTab({ onNavigate }: DashboardTabProps) {
  const queryClient = useQueryClient();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-bo", "stats"],
    queryFn: () => adminApi.stats(),
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
  ];

  return (
    <div>
      <h2 className="font-heading text-2xl text-white uppercase tracking-tight mb-6">
        Tableau de bord
      </h2>

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
