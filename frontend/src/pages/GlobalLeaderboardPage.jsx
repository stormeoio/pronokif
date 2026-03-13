import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, Crown, Trophy, Users, Globe, Zap } from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";

export default function GlobalLeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [avatars, setAvatars] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [lbRes, avatarsRes] = await Promise.all([
        apiClient.get("/leaderboard/global?limit=100"),
        apiClient.get("/avatars")
      ]);

      setLeaderboard(lbRes.data.leaderboard);
      setMyPosition(lbRes.data.my_position);
      setTotalPlayers(lbRes.data.total_players);
      setAvatars(avatarsRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAvatarById = (avatarId) => {
    return avatars?.all?.find(a => a.id === avatarId) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-gaming rounded" />
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 skeleton-gaming rounded-md" />)}
          </div>
        </div>
      </div>
    );
  }

  // Top 3 for podium
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen pb-24" data-testid="global-leaderboard-page" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-orange-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-orange-500 flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Classement Global
              </h1>
              <p className="font-body text-xs text-gray-400 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {totalPlayers} joueurs au total
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* My Position Card */}
        {myPosition && (
          <Card className="game-card border-cyan-500/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AvatarDisplay avatar={getAvatarById(user?.avatar_id)} customUrl={user?.custom_avatar_url} size="md" />
                <div>
                  <p className="font-heading text-sm text-white uppercase">{user?.username}</p>
                  <p className="font-body text-xs text-gray-400">Ta position</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-data text-3xl text-cyan-400">#{myPosition}</p>
                <p className="font-body text-xs text-gray-500">sur {totalPlayers}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Podium */}
        {podium.length >= 3 && (
          <div className="flex items-end justify-center gap-2 py-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <AvatarDisplay avatar={getAvatarById(podium[1]?.avatar_id)} size="lg" />
              <p className="font-heading text-sm text-white mt-2 truncate max-w-[80px]">{podium[1]?.username}</p>
              <p className="font-data text-xs text-gray-400">{podium[1]?.total_points} pts</p>
              <div className="w-20 h-16 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="font-heading text-2xl text-white">2</span>
              </div>
            </div>
            
            {/* 1st Place */}
            <div className="flex flex-col items-center -mt-4">
              <Crown className="w-8 h-8 text-yellow-500 mb-1" />
              <AvatarDisplay avatar={getAvatarById(podium[0]?.avatar_id)} size="xl" />
              <p className="font-heading text-sm text-white mt-2 truncate max-w-[90px]">{podium[0]?.username}</p>
              <p className="font-data text-xs text-yellow-400">{podium[0]?.total_points} pts</p>
              <div className="w-24 h-24 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="font-heading text-3xl text-white">1</span>
              </div>
            </div>
            
            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <AvatarDisplay avatar={getAvatarById(podium[2]?.avatar_id)} size="lg" />
              <p className="font-heading text-sm text-white mt-2 truncate max-w-[80px]">{podium[2]?.username}</p>
              <p className="font-data text-xs text-gray-400">{podium[2]?.total_points} pts</p>
              <div className="w-20 h-12 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="font-heading text-2xl text-white">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Rest of leaderboard */}
        <Card className="game-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm uppercase text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Classement complet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rest.length === 0 ? (
              <p className="font-body text-sm text-gray-500 text-center py-8">
                Pas assez de joueurs pour afficher le classement
              </p>
            ) : (
              <div className="divide-y divide-gray-800">
                {rest.map((entry) => {
                  const isMe = entry.user_id === user?.id;
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-3 ${
                        isMe ? "bg-cyan-500/10" : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded flex items-center justify-center bg-gray-800">
                        <span className="font-heading text-sm text-gray-400">
                          {entry.position}
                        </span>
                      </div>
                      <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className={`font-body text-sm truncate ${isMe ? "text-cyan-400" : "text-white"}`}>
                          {entry.username}
                          {isMe && <span className="text-xs text-gray-500 ml-1">(toi)</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-body text-xs text-gray-500">
                            Niv. {entry.level}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-data text-sm text-yellow-500">{entry.total_points}</p>
                        <p className="font-body text-[10px] text-gray-500 uppercase">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
