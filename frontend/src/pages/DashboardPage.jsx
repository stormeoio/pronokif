import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";
import { 
  Flag, Trophy, Clock, ChevronRight, Zap, Target,
  Calendar, MapPin, Users, Star, Gamepad2, Medal
} from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [nextRace, setNextRace] = useState(null);
  const [league, setLeague] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myPrediction, setMyPrediction] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [avatars, setAvatars] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [raceRes, avatarsRes] = await Promise.all([
        apiClient.get("/races/next"),
        apiClient.get("/avatars")
      ]);
      setNextRace(raceRes.data);
      setAvatars(avatarsRes.data);

      if (user.current_league_id) {
        const [leagueRes, lbRes] = await Promise.all([
          apiClient.get(`/leagues/${user.current_league_id}`),
          apiClient.get(`/leagues/${user.current_league_id}/leaderboard`)
        ]);
        setLeague(leagueRes.data);
        setLeaderboard(lbRes.data.slice(0, 5));
      }

      if (raceRes.data) {
        try {
          const predRes = await apiClient.get(`/predictions/race/${raceRes.data.id}`);
          setMyPrediction(predRes.data);
        } catch {
          setMyPrediction(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.current_league_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!nextRace?.predictions_close_at) return;
    
    const updateCountdown = () => {
      const diff = new Date(nextRace.predictions_close_at) - new Date();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60)
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  const getAvatarById = (avatarId) => {
    return avatars?.all?.find(a => a.id === avatarId) || null;
  };

  const myPosition = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-sky-racing p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton-arcade rounded-lg" />
          <div className="h-40 skeleton-arcade rounded-lg" />
          <div className="h-32 skeleton-arcade rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-racing pb-24" data-testid="dashboard-page">
      {/* Header with Logo */}
      <div className="relative py-6 px-4">
        {/* Checkered flags decoration */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 checkered-flag-left opacity-80" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 checkered-flag-right opacity-80" />
        
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-heading text-4xl text-gold-3d tracking-wider">
            PRONOKIF
          </h1>
          <p className="font-body text-white/80 text-sm mt-1 tracking-wide">
            Pronostics F1 entre amis
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* League & User Info */}
        <div className="card-chrome p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AvatarDisplay avatar={getAvatarById(user?.avatar_id)} customUrl={user?.custom_avatar_url} size="md" />
              <div>
                <p className="font-heading text-lg text-gray-800 uppercase">{user?.username}</p>
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                    Niv. {user?.level || 1}
                  </span>
                  <span className="font-data text-xs text-yellow-600">
                    <Zap className="w-3 h-3 inline" /> {user?.xp || 0} XP
                  </span>
                </div>
              </div>
            </div>
            {league && (
              <div className="text-right">
                <p className="font-body text-xs text-gray-500 uppercase">Ligue</p>
                <p className="font-heading text-sm text-blue-600">{league.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Race Card */}
        {nextRace && (
          <div className="card-neon p-4 relative overflow-hidden">
            {/* Sprint badge */}
            {nextRace.is_sprint_weekend && (
              <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-900 font-heading text-xs px-3 py-1 rounded-bl-lg">
                SPRINT
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-racing-red flex items-center justify-center flex-shrink-0"
                   style={{ background: 'linear-gradient(180deg, #e63946 0%, #b91c1c 100%)' }}>
                <Flag className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-body text-xs text-cyan-400 uppercase tracking-wider">Prochain Grand Prix</p>
                <h2 className="font-heading text-xl text-white uppercase tracking-tight">
                  {nextRace.name.replace(" Grand Prix", "")}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {nextRace.circuit}
                  </span>
                  <span className="font-body text-xs text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(nextRace.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Countdown */}
            <div className="mt-4 pt-4 border-t border-blue-500/30">
              <p className="font-body text-xs text-center text-cyan-400 uppercase mb-2">
                <Clock className="w-3 h-3 inline mr-1" /> Clôture des pronos dans
              </p>
              <div className="flex justify-center gap-2">
                {[
                  { value: countdown.days, label: "J" },
                  { value: countdown.hours, label: "H" },
                  { value: countdown.minutes, label: "M" },
                  { value: countdown.seconds, label: "S" }
                ].map((item, i) => (
                  <div key={i} className="countdown-digit w-14 h-14 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">{String(item.value).padStart(2, '0')}</span>
                    <span className="text-[10px] text-gray-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prediction Status & CTA */}
            <div className="mt-4">
              {myPrediction ? (
                <div className="flex items-center justify-between bg-green-500/20 border border-green-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-body text-green-400 text-sm">Pronos enregistrés !</span>
                  </div>
                  <Button onClick={() => navigate(`/predictions/${nextRace.id}`)} className="btn-gold text-sm px-4 py-2">
                    Modifier
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => navigate(`/predictions/${nextRace.id}`)} 
                  className="btn-racing w-full h-14 text-lg"
                >
                  <Target className="w-5 h-5 mr-2" />
                  FAIRE MES PRONOS
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate("/minigames")} className="card-chrome p-4 text-left hover:scale-[1.02] transition-transform">
            <Gamepad2 className="w-8 h-8 text-purple-600 mb-2" />
            <p className="font-heading text-sm text-gray-800 uppercase">Mini-Jeux</p>
            <p className="font-body text-xs text-gray-500">Reaction & Batak</p>
          </button>
          <button onClick={() => navigate("/missions")} className="card-chrome p-4 text-left hover:scale-[1.02] transition-transform">
            <Medal className="w-8 h-8 text-yellow-600 mb-2" />
            <p className="font-heading text-sm text-gray-800 uppercase">Missions</p>
            <p className="font-body text-xs text-gray-500">Gagne de l'XP</p>
          </button>
        </div>

        {/* League Leaderboard */}
        {league && leaderboard.length > 0 && (
          <div className="card-chrome overflow-hidden">
            <div className="bg-kerb-stripe h-2" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg text-gray-800 uppercase flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Classement
                </h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/leaderboard")} className="text-blue-600 font-body text-xs">
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.user_id === user?.id;
                  return (
                    <div 
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        i === 0 ? 'position-1' : i === 1 ? 'position-2' : i === 2 ? 'position-3' : 'bg-gray-300 text-gray-600'
                      }`}>
                        <span className="font-heading text-sm">{i + 1}</span>
                      </div>
                      <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                      <span className={`font-body text-sm flex-1 ${isMe ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                        {entry.username}
                        {isMe && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-yellow-500" />}
                      </span>
                      <span className="font-data text-sm text-gray-600">{entry.total_points} pts</span>
                    </div>
                  );
                })}
              </div>

              {myPosition > 5 && (
                <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="font-body text-sm text-gray-500">Ta position</span>
                  <span className="font-heading text-lg text-blue-600">#{myPosition}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No League */}
        {!league && (
          <div className="card-gold p-6 text-center">
            <Users className="w-12 h-12 text-yellow-700 mx-auto mb-3" />
            <h3 className="font-heading text-xl text-yellow-800 uppercase mb-2">Rejoins une Ligue !</h3>
            <p className="font-body text-yellow-700 text-sm mb-4">
              Crée ou rejoins une ligue pour jouer avec tes amis
            </p>
            <Button onClick={() => navigate("/league")} className="btn-racing">
              C'est parti !
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
