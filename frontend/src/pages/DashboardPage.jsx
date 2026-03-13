import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { 
  Flag, Trophy, Clock, ChevronRight, Zap, Target,
  Calendar, MapPin, Users, Star, Gamepad2, Medal
} from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";

// GP Background images - will be expanded with more circuits
const GP_BACKGROUNDS = {
  monaco: "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png",
  default: "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png"
};

// Hero banner with F1 car and PRONOKIF logo
const HERO_BANNER = "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/0988457c2bf0725d4e6fe4a0960dc4740d8e985496ab5a323c2c40ac2c8e0030.png";

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
        setLeaderboard(lbRes.data.slice(0, 3));
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

  const getGPBackground = (raceName) => {
    const name = raceName?.toLowerCase() || '';
    if (name.includes('monaco')) return GP_BACKGROUNDS.monaco;
    return GP_BACKGROUNDS.default;
  };

  const myPosition = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-48 skeleton-arcade rounded-xl" />
          <div className="h-64 skeleton-arcade rounded-xl" />
          <div className="h-40 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="dashboard-page">
      {/* Hero Banner with F1 Car and Logo */}
      <div className="relative w-full h-56 overflow-hidden">
        <img 
          src={HERO_BANNER} 
          alt="PRONOKIF" 
          className="w-full h-full object-cover object-top"
        />
        {/* Slogan overlay - positioned at the top, just below PRONOKIF text */}
        <div className="absolute top-[52px] left-0 right-0 text-center z-10">
          <p className="font-body text-[10px] text-white tracking-[0.08em] font-medium px-4"
             style={{textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)'}}>
            Pronostique 🔹 Défie tes amis 🔹 Domine le classement
          </p>
        </div>
        {/* Gradient overlay at bottom for smooth transition */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050a14] to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-4 relative z-10">
        
        {/* User Info Card - Brushed Aluminum Style */}
        <div className="card-brushed-aluminum p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="ring-2 ring-yellow-500 rounded-full p-0.5">
                <AvatarDisplay avatar={getAvatarById(user?.avatar_id)} customUrl={user?.custom_avatar_url} size="md" />
              </div>
              <div>
                <p className="font-heading text-lg text-gray-800 uppercase tracking-wide">{user?.username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-body text-xs text-white bg-gradient-to-r from-blue-600 to-blue-800 px-2 py-0.5 rounded-full shadow">
                    Niv. {user?.level || 1}
                  </span>
                  <span className="font-data text-xs text-yellow-700 flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-yellow-500 text-yellow-600" /> {user?.xp || 0} XP
                  </span>
                </div>
              </div>
            </div>
            {league && (
              <div className="text-right">
                <p className="font-body text-[10px] text-gray-500 uppercase tracking-wider">Ligue</p>
                <p className="font-heading text-sm text-blue-700">{league.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Race Card - Main Feature */}
        {nextRace && (
          <div className="card-arcade overflow-hidden">
            {/* GP Scenic Background */}
            <div 
              className="relative h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${getGPBackground(nextRace.name)})` }}
            >
              {/* Dark overlay for better text contrast */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#0c1525]" />
              
              {/* Sprint badge */}
              {nextRace.is_sprint_weekend && (
                <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-heading text-xs px-4 py-1 rounded-full shadow-lg animate-gold">
                  SPRINT WEEKEND
                </div>
              )}
              
              {/* Race Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-body text-xs text-cyan-300 uppercase tracking-widest mb-1 drop-shadow-lg">
                  Prochain Grand Prix
                </p>
                <h2 className="font-heading text-2xl text-white uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(251,191,36,0.4)'}}>
                  {nextRace.name.replace(" Grand Prix", "")}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="font-body text-xs text-white flex items-center gap-1 drop-shadow-lg">
                    <MapPin className="w-3 h-3 text-red-400" /> {nextRace.circuit}
                  </span>
                  <span className="font-body text-xs text-white flex items-center gap-1 drop-shadow-lg">
                    <Calendar className="w-3 h-3 text-blue-400" /> {new Date(nextRace.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Countdown Section */}
            <div className="p-4 border-t border-blue-500/30">
              <p className="font-body text-xs text-center text-cyan-neon uppercase mb-3 tracking-wider flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" /> Clôture des pronos dans
              </p>
              <div className="flex justify-center gap-2">
                {[
                  { value: countdown.days, label: "JOURS" },
                  { value: countdown.hours, label: "HEURES" },
                  { value: countdown.minutes, label: "MIN" },
                  { value: countdown.seconds, label: "SEC" }
                ].map((item, i) => (
                  <div key={i} className="countdown-digit w-16 h-16 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{String(item.value).padStart(2, '0')}</span>
                    <span className="text-[8px] text-gray-400 tracking-wider">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kerb Stripe Separator */}
            <div className="h-2 bg-kerb-stripe" />

            {/* Prediction Status & CTA */}
            <div className="p-4">
              {myPrediction ? (
                <div className="flex items-center justify-between bg-green-500/10 border-2 border-green-500/50 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-heading text-green-400 text-sm uppercase">Pronos enregistrés !</span>
                      <p className="font-body text-xs text-gray-400">Bonne chance pour ce GP</p>
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/predictions/${nextRace.id}`)} className="btn-gold text-sm px-5 py-2">
                    Modifier
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => navigate(`/predictions/${nextRace.id}`)} 
                  className="btn-racing w-full h-14 text-lg animate-neon"
                  data-testid="make-predictions-btn"
                >
                  <Target className="w-5 h-5 mr-2" />
                  FAIRE MES PRONOS
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions - Brushed Aluminum Style */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate("/minigames")} 
            className="card-brushed-aluminum p-4 text-left hover:scale-[1.02] transition-transform active:scale-[0.98]"
            data-testid="minigames-btn"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-3 shadow-lg">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <p className="font-heading text-sm text-gray-800 uppercase">Mini-Jeux</p>
            <p className="font-body text-xs text-gray-500">Reaction & Batak</p>
          </button>
          <button 
            onClick={() => navigate("/missions")} 
            className="card-brushed-aluminum p-4 text-left hover:scale-[1.02] transition-transform active:scale-[0.98]"
            data-testid="missions-btn"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center mb-3 shadow-lg">
              <Medal className="w-6 h-6 text-white" />
            </div>
            <p className="font-heading text-sm text-gray-800 uppercase">Missions</p>
            <p className="font-body text-xs text-gray-500">Gagne de l'XP</p>
          </button>
        </div>

        {/* League Leaderboard - Dark Panel Style */}
        {league && leaderboard.length > 0 && (
          <div className="card-arcade overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600/20 to-transparent p-4 border-b border-yellow-500/30">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Mes Ligues
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/leaderboard")} 
                  className="text-cyan-400 font-body text-xs hover:text-cyan-300 hover:bg-cyan-500/10"
                >
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Top 3 */}
            <div className="p-4 space-y-2">
              {leaderboard.map((entry, i) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div 
                    key={entry.user_id}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isMe 
                        ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-heading text-lg ${
                      i === 0 ? 'position-1' : i === 1 ? 'position-2' : i === 2 ? 'position-3' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {i + 1}
                    </div>
                    <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                    <span className={`font-body text-sm flex-1 ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                      {entry.username}
                      {isMe && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-yellow-500" />}
                    </span>
                    <span className="font-data text-sm text-cyan-400 font-semibold">
                      {entry.total_points} <span className="text-xs text-gray-500">pts</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {myPosition > 3 && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <span className="font-body text-sm text-gray-400">Ta position</span>
                  <span className="font-heading text-xl text-blue-400">#{myPosition}</span>
                </div>
              </div>
            )}

            <div className="h-2 bg-kerb-stripe" />
          </div>
        )}

        {/* No League CTA */}
        {!league && (
          <div className="card-gold p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl">
              <Users className="w-8 h-8 text-yellow-900" />
            </div>
            <h3 className="font-heading text-2xl text-yellow-800 uppercase mb-2">Rejoins une Ligue !</h3>
            <p className="font-body text-yellow-700 text-sm mb-5">
              Crée ou rejoins une ligue pour jouer avec tes amis
            </p>
            <Button onClick={() => navigate("/league")} className="btn-racing px-8 py-3">
              C'est parti !
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
