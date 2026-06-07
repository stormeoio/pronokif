/**
 * LeagueLeaderboard — Ranked list inside league detail.
 * Broadcast Premium: pk-gold/silver/bronze podium, pk-red "toi" highlight.
 */
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Crown, Medal, Award } from "lucide-react";
import type { ReactNode } from "react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";
import { UserIdentity } from "@/components/users/UserIdentity";
import type { LeaderboardEntry, LeagueMember } from "@/types/api";

/* ── Helpers ───────────────────────────────────────────── */

function getRankIcon(rank: number): ReactNode {
  if (rank === 1) return <Crown className="w-4 h-4 text-pk-gold" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-pk-silver" />;
  if (rank === 3) return <Award className="w-4 h-4 text-pk-bronze" />;
  return <span className="font-data text-[0.5625rem] text-pk-titane w-4 text-center">{rank}</span>;
}

function getRankStyle(rank: number): string {
  if (rank === 1) return "bg-pk-gold/[0.06] border-pk-gold/20";
  if (rank === 2) return "bg-pk-silver/[0.06] border-pk-silver/20";
  if (rank === 3) return "bg-pk-bronze/[0.06] border-pk-bronze/20";
  return "bg-white/[0.02] border-white/[0.08]";
}

/* ── Types ─────────────────────────────────────────────── */

interface LeagueLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  members: LeagueMember[];
  userId: string;
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueLeaderboard({
  leaderboard,
  members,
  userId,
}: LeagueLeaderboardProps) {
  const { t } = useTranslation();

  if (leaderboard.length === 0) {
    return <EmptyMinimal icon="🏆" message={t("leaderboard.empty_message")} />;
  }

  return (
    <motion.div
      className="space-y-1.5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {leaderboard.map((entry, index) => {
        const rank = index + 1;
        const isMe = entry.user_id === userId;
        const member = members.find((m) => m.id === entry.user_id);

        return (
          <motion.div
            key={entry.user_id}
            className={`p-3 rounded-lg border transition-colors ${getRankStyle(rank)} ${isMe ? "ring-1 ring-pk-red/30" : ""}`}
            variants={fadeUp}
          >
            <div className="flex items-center gap-2.5">
              {/* Rank */}
              <div className="w-7 h-7 flex items-center justify-center">{getRankIcon(rank)}</div>

              <UserIdentity
                user={{
                  ...entry,
                  custom_avatar_url: member?.custom_avatar_url ?? entry.custom_avatar_url,
                  avatar_id: member?.avatar_id ?? entry.avatar_id,
                  level: member?.level ?? entry.level,
                }}
                size="sm"
                showLevel
                className="flex-1"
                textClassName={isMe ? "text-pk-red" : ""}
                data-testid={`league-leaderboard-user-${entry.user_id}`}
              />
              {isMe && (
                <span className="font-data text-[0.5rem] text-pk-red/70 ml-1.5">
                  {t("common.you")}
                </span>
              )}

              {/* Points */}
              <div className="text-right">
                <p className={`font-data text-base font-bold ${rank <= 3 ? "text-pk-amber" : ""}`}>
                  {entry.total_points || 0}
                </p>
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">
                  {t("common.pts")}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
