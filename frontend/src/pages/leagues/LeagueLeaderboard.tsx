/**
 * LeagueLeaderboard — Ranked list inside league detail.
 * Broadcast Premium: pk-gold/silver/bronze podium, pk-red "toi" highlight.
 */
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Award, User } from "lucide-react";
import type { ReactNode } from "react";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";
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
  getAvatar: (member: LeagueMember) => string | null;
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueLeaderboard({
  leaderboard,
  members,
  userId,
  getAvatar,
}: LeagueLeaderboardProps) {
  if (leaderboard.length === 0) {
    return <EmptyMinimal icon="🏆" message="Points will be calculated after the races" />;
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
        const avatar = member ? getAvatar(member) : null;

        return (
          <motion.div
            key={entry.user_id}
            className={`p-3 rounded-lg border transition-colors ${getRankStyle(rank)} ${isMe ? "ring-1 ring-pk-red/30" : ""}`}
            variants={fadeUp}
          >
            <div className="flex items-center gap-2.5">
              {/* Rank */}
              <div className="w-7 h-7 flex items-center justify-center">{getRankIcon(rank)}</div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-pk-anthracite flex-shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={entry.username ?? "member"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4 h-4 text-pk-titane" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-display text-sm truncate ${isMe ? "text-pk-red" : ""}`}>
                  {entry.username ?? "Anonyme"}
                  {isMe && (
                    <span className="font-data text-[0.5rem] text-pk-red/70 ml-1.5">(toi)</span>
                  )}
                </p>
                <p className="font-data text-[0.5625rem] text-pk-titane">
                  Niv. {member?.level || 1}
                </p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className={`font-data text-base font-bold ${rank <= 3 ? "text-pk-amber" : ""}`}>
                  {entry.total_points || 0}
                </p>
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">pts</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
