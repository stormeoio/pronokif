/**
 * Admin Dashboard — overview stats.
 */
import { useQuery } from "@tanstack/react-query";
import { Users, Trophy, Flag, MessageSquare, Mail, TrendingUp } from "lucide-react";
import { adminApi } from "../adminApi";

export default function DashboardTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-bo", "stats"],
    queryFn: () => adminApi.stats(),
    refetchInterval: 30_000,
  });

  const cards = [
    { label: "Utilisateurs", value: stats?.total_users ?? "—", icon: Users, color: "cyan" },
    {
      label: "Pronostics",
      value: stats?.total_predictions ?? "—",
      icon: TrendingUp,
      color: "orange",
    },
    { label: "Ligues", value: stats?.total_leagues ?? "—", icon: Trophy, color: "purple" },
    { label: "Courses", value: stats?.total_races ?? "—", icon: Flag, color: "green" },
    {
      label: "Feedbacks non lus",
      value: stats?.unread_feedbacks ?? "—",
      icon: MessageSquare,
      color: "yellow",
    },
    {
      label: "Invitations en attente",
      value: stats?.pending_invitations ?? "—",
      icon: Mail,
      color: "red",
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
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`card-arcade p-4 border-l-4 border-${color}-500`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <p className="font-data text-2xl text-white">{value}</p>
                <p className="font-body text-xs text-gray-500">{label}</p>
              </div>
            ))}
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
        </>
      )}
    </div>
  );
}
