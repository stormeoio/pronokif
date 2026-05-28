/**
 * MiniGamesLeaderboard — Leaderboard sub-component for mini-games.
 * Broadcast Premium: pk-surface card, pk-gold/silver/bronze ranks.
 */
import { motion } from "framer-motion";
import { Medal, Users, Crown } from "lucide-react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import { staggerContainer, fadeUp } from "@/lib/motion";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_id?: string;
  best_score: number;
  position?: number;
}

interface MiniGamesLeaderboardProps {
  activeTab: "reaction" | "batak";
  mode: string;
  leagueName?: string;
  userId?: string;
  leagueLeaderboard: LeaderboardEntry[];
  globalLeaderboard: LeaderboardEntry[];
  getAvatarById: (id: string | undefined) => any;
}

export function MiniGamesLeaderboard({
  activeTab,
  mode,
  leagueName,
  userId,
  leagueLeaderboard,
  globalLeaderboard,
  getAvatarById,
}: MiniGamesLeaderboardProps) {
  const scoreColor = activeTab === "reaction" ? "text-pk-amber" : "text-pk-info";
  const formatScore = (score: number) => (activeTab === "reaction" ? `${score}ms` : `${score} pts`);

  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
        <Medal className="w-4 h-4 text-pk-amber" />
        <h3 className="font-display text-sm">
          Classement {activeTab === "reaction" ? "Reaction" : "Batak"}
        </h3>
        {mode === "competition" && leagueName && (
          <span className="font-data text-[0.5rem] text-pk-titane ml-1">({leagueName})</span>
        )}
      </div>

      <div className="p-3 space-y-4">
        {/* League Leaderboard */}
        {mode === "competition" && (
          <div>
            <p className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider px-1 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Ligue - Ce weekend
            </p>
            {leagueLeaderboard.length === 0 ? (
              <p className="text-xs text-pk-titane text-center py-4">
                Aucun score enregistre ce weekend
              </p>
            ) : (
              <LeaderboardList
                entries={leagueLeaderboard.slice(0, 10)}
                userId={userId}
                scoreColor={scoreColor}
                formatScore={formatScore}
                getAvatarById={getAvatarById}
              />
            )}
          </div>
        )}

        {/* Global Leaderboard */}
        <div>
          <p className="font-data text-[0.5rem] text-pk-titane uppercase tracking-wider px-1 mb-2 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Classement global (tous les temps)
          </p>
          {globalLeaderboard.length === 0 ? (
            <p className="text-xs text-pk-titane text-center py-4">Aucun score enregistre</p>
          ) : (
            <LeaderboardList
              entries={globalLeaderboard.slice(0, 10)}
              userId={userId}
              scoreColor={scoreColor}
              formatScore={formatScore}
              getAvatarById={getAvatarById}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Leaderboard List ─────────────────────────────────── */

function LeaderboardList({
  entries,
  userId,
  scoreColor,
  formatScore,
  getAvatarById,
}: {
  entries: LeaderboardEntry[];
  userId?: string;
  scoreColor: string;
  formatScore: (s: number) => string;
  getAvatarById: (id: string | undefined) => any;
}) {
  return (
    <motion.div
      className="space-y-1"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {entries.map((entry, i) => (
        <motion.div
          key={entry.user_id}
          className={`flex items-center gap-2.5 p-2 rounded-lg ${
            entry.user_id === userId ? "bg-pk-red-subtle border border-pk-red/20" : ""
          }`}
          variants={fadeUp}
        >
          {/* Position */}
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center font-data text-[0.5625rem] font-bold ${
              i === 0
                ? "bg-pk-gold/[0.2] text-pk-gold"
                : i === 1
                  ? "bg-pk-silver/[0.2] text-pk-silver"
                  : i === 2
                    ? "bg-pk-bronze/[0.2] text-pk-bronze"
                    : "bg-white/[0.04] text-pk-titane"
            }`}
          >
            {entry.position ?? i + 1}
          </div>

          {/* Avatar */}
          <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />

          {/* Name */}
          <span className="text-sm flex-1 truncate">{entry.username}</span>

          {/* Score */}
          <span className={`font-data text-sm ${scoreColor}`}>{formatScore(entry.best_score)}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
