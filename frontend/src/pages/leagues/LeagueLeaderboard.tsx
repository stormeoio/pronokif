import type { ReactNode } from "react";
import { Trophy, Crown, Medal, Award, User } from "lucide-react";

function getRankIcon(rank: number): ReactNode {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="font-data text-gray-500 w-5 text-center">{rank}</span>;
}

function getRankStyle(rank: number): string {
  if (rank === 1)
    return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/50";
  if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50";
  if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/50";
  return "bg-gray-800/30 border-gray-700/50";
}

interface LeagueLeaderboardProps {
  leaderboard: Record<string, any>[];
  members: Record<string, any>[];
  userId: string;
  getAvatar: (member: Record<string, any>) => string | null;
}

export default function LeagueLeaderboard({
  leaderboard,
  members,
  userId,
  getAvatar,
}: LeagueLeaderboardProps) {
  if (leaderboard.length === 0) {
    return (
      <div className="card-arcade p-8 text-center">
        <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="font-body text-gray-400">Aucun classement disponible</p>
        <p className="font-body text-xs text-gray-500 mt-1">
          Les points seront calculés après les courses
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, index) => {
        const rank = index + 1;
        const isMe = entry.user_id === userId;
        const member = members.find((m) => m.id === entry.user_id);
        const avatar = member ? getAvatar(member) : null;

        return (
          <div
            key={entry.user_id}
            className={`p-3 rounded-lg border transition-all ${getRankStyle(rank)} ${isMe ? "ring-2 ring-cyan-500/50" : ""}`}
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <div className="w-8 h-8 flex items-center justify-center">{getRankIcon(rank)}</div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-heading text-sm truncate ${isMe ? "text-cyan-400" : "text-white"}`}
                >
                  {entry.username || "Anonyme"}
                  {isMe && <span className="text-xs text-cyan-400/70 ml-2">(toi)</span>}
                </p>
                <p className="font-body text-xs text-gray-500">Niveau {member?.level || 1}</p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className={`font-data text-lg ${rank <= 3 ? "text-yellow-400" : "text-white"}`}>
                  {entry.total_points}
                </p>
                <p className="font-body text-[10px] text-gray-500 uppercase">points</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
