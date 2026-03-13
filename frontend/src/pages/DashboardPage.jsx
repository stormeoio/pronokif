import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Target, Trophy, Clock, MapPin, Calendar, ChevronRight, 
  TrendingUp, TrendingDown, Minus, Flag, Users, Zap, Star
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nextRace, setNextRace] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myPrediction, setMyPrediction] = useState(null);
  const [league, setLeague] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [raceRes, leagueRes] = await Promise.all([
        apiClient.get("/races/next"),
        user.current_league_id ? apiClient.get(`/leagues/${user.current_league_id}`) : null
      ]);

      setNextRace(raceRes.data);
      if (leagueRes) {
        setLeague(leagueRes.data);
        const leaderboardRes = await apiClient.get(`/leagues/${user.current_league_id}/leaderboard`);
        setLeaderboard(leaderboardRes.data);
      }

      // Fetch my prediction for next race
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
  };

  // Countdown timer
  useEffect(() => {
    if (!nextRace) return;

    const updateCountdown = () => {
      const closeTime = new Date(nextRace.predictions_close_at);
      const now = new Date();
      const diff = closeTime - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  const myPosition = leaderboard.find(e => e.user_id === user.id);
  const isPredictionOpen = nextRace?.status === "upcoming";

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-48 skeleton-gaming rounded" />
          <div className="h-64 skeleton-gaming rounded-md" />
          <div className="h-48 skeleton-gaming rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-6" data-testid="dashboard-page"
         style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with user info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-lg bg-gradient-to-b from-orange-500 to-orange-700 border-2 border-orange-400 flex items-center justify-center glow-orange">
              <span className="font-heading text-xl text-white">
                {user.username?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className="font-body text-gray-400 text-sm">Bienvenue,</p>
              <h1 className="font-heading text-xl uppercase tracking-tight text-white">
                {user.username}
              </h1>
              {/* XP Bar */}
              <div className="flex items-center gap-2 mt-1">
                <span className="font-data text-xs text-cyan-400">Niv. {user.level || 1}</span>
                <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="xp-bar h-full rounded-full" style={{ width: `${(user.xp || 0) % 100}%` }} />
                </div>
                <span className="font-data text-xs text-gray-500">XP {user.xp || 0}</span>
              </div>
            </div>
          </div>
          {league && (
            <div className="text-right">
              <p className="font-body text-gray-500 text-xs uppercase">Ligue</p>
              <p className="font-heading text-sm uppercase tracking-tight text-cyan-400">
                {league.name}
              </p>
            </div>
          )}
        </div>

        {/* Next Race Card - Gaming Style */}
        {nextRace && (
          <Card className="game-card racing-stripe overflow-hidden relative" data-testid="next-race-card">
            <CardContent className="relative p-6 pt-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-data text-xs text-orange-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    Prochain Grand Prix
                  </p>
                  <h2 className="font-heading text-2xl md:text-3xl uppercase tracking-tight text-white text-glow-orange">
                    {nextRace.name.replace(" Grand Prix", "")}
                  </h2>
                  <p className="font-heading text-lg text-gray-400 uppercase">Grand Prix</p>
                  <div className="flex items-center gap-4 mt-2 text-gray-400">
                    <span className="flex items-center gap-1 text-sm font-body">
                      <MapPin className="w-4 h-4 text-cyan-500" />
                      {nextRace.circuit}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-body">
                      <Calendar className="w-4 h-4 text-cyan-500" />
                      {new Date(nextRace.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg border border-gray-600 flex items-center justify-center">
                  <Flag className="w-6 h-6 text-orange-500" />
                </div>
              </div>

              {/* Countdown - Gaming Style */}
              {isPredictionOpen && (
                <div className="mb-6">
                  <p className="font-body text-gray-400 text-xs mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-500" />
                    Clôture des pronostics
                  </p>
                  <div className="flex gap-2">
                    {[
                      { value: countdown.days, label: 'J' },
                      { value: countdown.hours, label: 'H' },
                      { value: countdown.minutes, label: 'M' },
                      { value: countdown.seconds, label: 'S' },
                    ].map((item, i) => (
                      <div 
                        key={i}
                        className="countdown-gaming flex-1 p-3 rounded-lg text-center"
                      >
                        <span className="font-data text-2xl text-white block">
                          {String(item.value).padStart(2, '0')}
                        </span>
                        <span className="font-body text-xs text-cyan-500 uppercase font-bold">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Button - Gaming Style */}
              <Button
                onClick={() => navigate(`/predictions/${nextRace.id}`)}
                disabled={!isPredictionOpen}
                className={`w-full h-14 font-heading uppercase tracking-wider transition-all ${
                  isPredictionOpen 
                    ? 'btn-gaming animate-pulse-orange' 
                    : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
                }`}
                data-testid="make-predictions-btn"
              >
                <Target className="w-5 h-5 mr-2" />
                {myPrediction 
                  ? isPredictionOpen ? "Modifier mes pronos" : "Pronos verrouillés"
                  : isPredictionOpen ? "Faire mes pronos" : "Pronos fermés"
                }
                {isPredictionOpen && <ChevronRight className="w-5 h-5 ml-2" />}
              </Button>

              {myPrediction && isPredictionOpen && (
                <p className="text-center text-green-400 text-sm font-body mt-3 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-current" />
                  Pronos enregistrés
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* My Position Card */}
        {myPosition && (
          <Card className="game-card" data-testid="my-position-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-heading text-xl ${
                    myPosition.position === 1 ? 'position-1-gaming' :
                    myPosition.position === 2 ? 'position-2-gaming' :
                    myPosition.position === 3 ? 'position-3-gaming' :
                    'bg-gray-800 text-white border-2 border-gray-700'
                  }`}>
                    {myPosition.position}
                  </div>
                  <div>
                    <p className="font-heading text-lg uppercase tracking-tight text-white">
                      Ta position
                    </p>
                    <p className="font-data text-sm text-cyan-400">
                      {myPosition.total_points} points
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {myPosition.position_change > 0 && (
                    <span className="flex items-center text-green-400 font-data text-sm bg-green-500/20 px-2 py-1 rounded">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +{myPosition.position_change}
                    </span>
                  )}
                  {myPosition.position_change < 0 && (
                    <span className="flex items-center text-red-400 font-data text-sm bg-red-500/20 px-2 py-1 rounded">
                      <TrendingDown className="w-4 h-4 mr-1" />
                      {myPosition.position_change}
                    </span>
                  )}
                  {myPosition.position_change === 0 && (
                    <span className="flex items-center text-gray-400 font-data text-sm">
                      <Minus className="w-4 h-4 mr-1" />
                      =
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Preview */}
        <Card className="game-card" data-testid="leaderboard-preview">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2 text-yellow-500">
                <Trophy className="w-5 h-5" />
                Classement
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/leaderboard")}
                className="text-cyan-400 hover:text-cyan-300 font-body text-sm"
                data-testid="view-full-leaderboard"
              >
                Voir tout
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div 
                key={entry.user_id}
                className={`grid grid-cols-12 gap-2 items-center p-3 border-b border-gray-800 transition-colors hover:bg-white/5 ${
                  entry.user_id === user.id ? 'bg-orange-500/10' : ''
                }`}
              >
                <div className="col-span-2">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-heading text-sm ${
                    index === 0 ? 'position-1-gaming' :
                    index === 1 ? 'position-2-gaming' :
                    index === 2 ? 'position-3-gaming' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {entry.position}
                  </span>
                </div>
                <div className="col-span-6">
                  <p className={`font-body text-sm truncate ${
                    entry.user_id === user.id ? 'text-orange-400 font-semibold' : 'text-white'
                  }`}>
                    {entry.username}
                    {entry.user_id === user.id && " (toi)"}
                  </p>
                </div>
                <div className="col-span-4 text-right">
                  <span className="font-data text-sm text-white">{entry.total_points}</span>
                  <span className="font-body text-xs text-gray-500 ml-1">pts</span>
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-body text-gray-500 text-sm">
                  Invite tes amis pour commencer la compétition !
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
