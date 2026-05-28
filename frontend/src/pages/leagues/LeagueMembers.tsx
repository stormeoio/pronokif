/**
 * LeagueMembers — Member list inside league detail.
 * Broadcast Premium: pk-surface rows, pk-red "toi", pk-amber owner badge.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Zap, User } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { LeagueMember as LeagueMemberType, LeaderboardEntry } from "@/types/api";

/* ── Types ─────────────────────────────────────────────── */

interface LeagueMembersProps {
  members: LeagueMemberType[];
  leaderboard: LeaderboardEntry[];
  userId: string;
  ownerId: string;
  getAvatar: (member: LeagueMemberType) => string | null;
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueMembers({
  members,
  leaderboard,
  userId,
  ownerId,
  getAvatar,
}: LeagueMembersProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      className="space-y-1.5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {members.map((member) => {
        const isMe = member.id === userId;
        const isMemberOwner = ownerId === member.id;
        const avatar = getAvatar(member);
        const lbEntry = leaderboard.find((e) => e.user_id === member.id);

        return (
          <motion.button
            key={member.id}
            onClick={() => {
              haptic("light");
              navigate(`/profile/${member.id}`);
            }}
            className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-white/[0.02] ${
              isMe ? "bg-pk-red-subtle border-pk-red/20" : "bg-white/[0.02] border-white/[0.08]"
            }`}
            variants={fadeUp}
            data-testid={`member-row-${member.id}`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-pk-anthracite flex-shrink-0 relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={member.username ?? "member"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4.5 h-4.5 text-pk-titane" />
                  </div>
                )}
                {isMemberOwner && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pk-amber rounded-full flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`font-display text-sm truncate ${isMe ? "text-pk-red" : ""}`}>
                    {member.username ?? "Anonyme"}
                  </p>
                  {isMe && (
                    <span className="font-data text-[0.5rem] bg-pk-red/20 text-pk-red px-1 py-0.5 rounded uppercase">
                      Toi
                    </span>
                  )}
                  {isMemberOwner && (
                    <span className="font-data text-[0.5rem] bg-pk-amber/20 text-pk-amber px-1 py-0.5 rounded uppercase">
                      Createur
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="font-data text-[0.5625rem] text-pk-titane">
                    Niv. {member.level || 1}
                  </span>
                  <span className="font-data text-[0.5625rem] text-pk-titane flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    {member.xp || 0} XP
                  </span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-data text-base font-bold text-pk-amber">
                  {Number(lbEntry?.total_points) || 0}
                </p>
                <p className="font-data text-[0.5rem] text-pk-titane uppercase">pts</p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
