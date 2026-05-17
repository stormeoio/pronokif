import { motion } from "framer-motion";
import { Medal, Users, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { AvatarDisplay } from "../../components/AvatarDisplay";

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
  const scoreColor = activeTab === "reaction" ? "text-orange-400" : "text-cyan-400";
  const formatScore = (score: number) => (activeTab === "reaction" ? `${score}ms` : `${score} pts`);

  return (
    <Card className="game-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
          <Medal className="w-4 h-4" />
          Classement {activeTab === "reaction" ? "Reaction" : "Batak"}
          {mode === "competition" && leagueName && (
            <span className="text-gray-500 text-xs ml-2">({leagueName})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {/* League Leaderboard */}
        {mode === "competition" && (
          <div className="mb-4">
            <p className="font-body text-xs text-gray-500 px-2 mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Ligue - Ce weekend
            </p>
            {leagueLeaderboard.length === 0 ? (
              <p className="font-body text-sm text-gray-500 text-center py-4">
                Aucun score enregistré pour ce weekend
              </p>
            ) : (
              <LeaderboardList
                entries={leagueLeaderboard.slice(0, 10)}
                userId={userId}
                highlightClass="bg-orange-500/10 border border-orange-500/30"
                scoreColor={scoreColor}
                formatScore={formatScore}
                getAvatarById={getAvatarById}
              />
            )}
          </div>
        )}

        {/* Global Leaderboard */}
        <div>
          <p className="font-body text-xs text-gray-500 px-2 mb-2 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Classement Global (All-time)
          </p>
          {globalLeaderboard.length === 0 ? (
            <p className="font-body text-sm text-gray-500 text-center py-4">
              Aucun score enregistré
            </p>
          ) : (
            <LeaderboardList
              entries={globalLeaderboard.slice(0, 10)}
              userId={userId}
              highlightClass="bg-cyan-500/10 border border-cyan-500/30"
              scoreColor={scoreColor}
              formatScore={formatScore}
              getAvatarById={getAvatarById}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardList({
  entries,
  userId,
  highlightClass,
  scoreColor,
  formatScore,
  getAvatarById,
}: {
  entries: LeaderboardEntry[];
  userId?: string;
  highlightClass: string;
  scoreColor: string;
  formatScore: (s: number) => string;
  getAvatarById: (id: string | undefined) => any;
}) {
  return (
    <motion.div
      className="space-y-2"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
    >
      {entries.map((entry, i) => (
        <motion.div
          key={entry.user_id}
          className={`flex items-center gap-3 p-2 rounded-lg ${entry.user_id === userId ? highlightClass : ""}`}
          variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
          whileHover={{ x: 3 }}
        >
          <div
            className={`w-8 h-8 rounded flex items-center justify-center ${
              i === 0
                ? "position-1-gaming"
                : i === 1
                  ? "position-2-gaming"
                  : i === 2
                    ? "position-3-gaming"
                    : "bg-gray-700"
            }`}
          >
            <span
              className={`font-heading text-sm ${i < 3 && i !== 2 ? "text-black" : "text-white"}`}
            >
              {entry.position ?? i + 1}
            </span>
          </div>
          <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
          <span className="font-body text-sm text-white flex-1 truncate">{entry.username}</span>
          <span className={`font-data text-sm ${scoreColor}`}>{formatScore(entry.best_score)}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
