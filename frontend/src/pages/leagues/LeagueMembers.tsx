import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Crown, Star, Target, User } from "lucide-react";

interface LeagueMembersProps {
  members: Record<string, any>[];
  leaderboard: Record<string, any>[];
  userId: string;
  ownerId: string;
  getAvatar: (member: Record<string, any>) => string | null;
}

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
      className="space-y-2"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
    >
      {members.map((member) => {
        const isMe = member.id === userId;
        const isMemberOwner = ownerId === member.id;
        const avatar = getAvatar(member);
        const leaderboardEntry = leaderboard.find((e) => e.user_id === member.id);

        return (
          <motion.button
            key={member.id}
            onClick={() => navigate(`/profile/${member.id}`)}
            className={`w-full p-3 rounded-lg border bg-gray-800/30 border-gray-700/50 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left ${isMe ? "ring-2 ring-cyan-500/30" : ""}`}
            variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0 relative">
                {avatar ? (
                  <img src={avatar} alt={`Avatar de ${member.username || "membre"}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                {isMemberOwner && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-heading text-sm truncate ${isMe ? "text-cyan-400" : "text-white"}`}
                  >
                    {member.username || "Anonyme"}
                  </p>
                  {isMe && (
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                      TOI
                    </span>
                  )}
                  {isMemberOwner && (
                    <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                      CRÉATEUR
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-body text-xs text-gray-500 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Niveau {member.level || 1}
                  </span>
                  <span className="font-body text-xs text-gray-500 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {member.xp || 0} XP
                  </span>
                </div>
              </div>

              {/* Points in league */}
              <div className="text-right">
                <p className="font-data text-lg text-yellow-400">
                  {leaderboardEntry?.total_points || 0}
                </p>
                <p className="font-body text-[10px] text-gray-500 uppercase">pts</p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
