import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Target, Trophy, Clock, MapPin, Calendar, ChevronRight, 
  TrendingUp, TrendingDown, Minus, Flag, Users
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
      <div className="min-h-screen bg-background p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-64 skeleton rounded-md" />
          <div className="h-48 skeleton rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-6" data-testid="dashboard-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-body text-zinc-400 text-sm">Bienvenue,</p>
            <h1 className="font-heading text-2xl uppercase tracking-tight italic text-white">
              {user.username}
            </h1>
          </div>
          {league && (
            <div className="text-right">
              <p className="font-body text-zinc-400 text-xs">Ligue</p>
              <p className="font-heading text-sm uppercase tracking-tight text-white">
                {league.name}
              </p>
            </div>
          )}
        </div>

        {/* Next Race Card */}
        {nextRace && (
          <Card className="bg-card border-white/10 overflow-hidden relative" data-testid="next-race-card">
            {/* Background Image */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1749952649510-c2197ce61b9a?crop=entropy&cs=srgb&fm=jpg&w=800')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-card/80" />

            <CardContent className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-data text-xs text-primary uppercase tracking-widest mb-1">
                    Prochain Grand Prix
                  </p>
                  <h2 className="font-heading text-2xl md:text-3xl uppercase tracking-tight italic text-white">
                    {nextRace.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-zinc-400">
                    <span className="flex items-center gap-1 text-sm font-body">
                      <MapPin className="w-4 h-4" />
                      {nextRace.circuit}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-body">
                      <Calendar className="w-4 h-4" />
                      {new Date(nextRace.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                  </div>
                </div>
                <Flag className="w-8 h-8 text-primary opacity-50" />
              </div>

              {/* Countdown */}
              {isPredictionOpen && (
                <div className="mb-6">
                  <p className="font-body text-zinc-400 text-xs mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Clôture des pronostics
                  </p>
                  <div className="flex gap-2">
                    {[
                      { value: countdown.days, label: 'j' },
                      { value: countdown.hours, label: 'h' },
                      { value: countdown.minutes, label: 'm' },
                      { value: countdown.seconds, label: 's' },
                    ].map((item, i) => (
                      <div 
                        key={i}
                        className="countdown-segment flex-1 p-3 rounded-sm text-center"
                      >
                        <span className="font-data text-2xl text-white block">
                          {String(item.value).padStart(2, '0')}
                        </span>
                        <span className="font-body text-xs text-zinc-500 uppercase">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA Button */}
              <Button
                onClick={() => navigate(`/predictions/${nextRace.id}`)}
                disabled={!isPredictionOpen}
                className={`w-full h-14 font-heading uppercase tracking-wider transition-all duration-300 ${
                  isPredictionOpen 
                    ? 'bg-primary hover:bg-red-600 glow-red animate-pulse-glow' 
                    : 'bg-zinc-800 text-zinc-400'
                }`}
                data-testid="make-predictions-btn"
              >
                <Target className="w-5 h-5 mr-2" />
                {myPrediction 
                  ? isPredictionOpen ? "Modifier mes pronostics" : "Pronostics verrouillés"
                  : isPredictionOpen ? "Faire mes pronostics" : "Pronostics fermés"
                }
                {isPredictionOpen && <ChevronRight className="w-5 h-5 ml-2" />}
              </Button>

              {myPrediction && isPredictionOpen && (
                <p className="text-center text-emerald-500 text-sm font-body mt-3 flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Pronostics enregistrés
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* My Position */}
        {myPosition && (
          <Card className="bg-card border-white/10" data-testid="my-position-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-sm flex items-center justify-center font-heading text-xl ${
                    myPosition.position === 1 ? 'bg-amber-500 text-black' :
                    myPosition.position === 2 ? 'bg-zinc-300 text-black' :
                    myPosition.position === 3 ? 'bg-amber-700 text-white' :
                    'bg-zinc-800 text-white'
                  }`}>
                    {myPosition.position}
                  </div>
                  <div>
                    <p className="font-heading text-lg uppercase tracking-tight text-white">
                      Ta position
                    </p>
                    <p className="font-data text-sm text-zinc-400">
                      {myPosition.total_points} points
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {myPosition.position_change > 0 && (
                    <span className="flex items-center text-emerald-500 font-data text-sm">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      +{myPosition.position_change}
                    </span>
                  )}
                  {myPosition.position_change < 0 && (
                    <span className="flex items-center text-red-500 font-data text-sm">
                      <TrendingDown className="w-4 h-4 mr-1" />
                      {myPosition.position_change}
                    </span>
                  )}
                  {myPosition.position_change === 0 && (
                    <span className="flex items-center text-zinc-500 font-data text-sm">
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
        <Card className="bg-card border-white/10" data-testid="leaderboard-preview">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Classement
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/leaderboard")}
                className="text-zinc-400 hover:text-white font-body text-sm"
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
                className={`leaderboard-row grid grid-cols-12 gap-2 items-center p-3 border-b border-white/5 ${
                  entry.user_id === user.id ? 'bg-primary/10' : ''
                }`}
              >
                <div className="col-span-2">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-sm font-heading text-sm ${
                    index === 0 ? 'bg-amber-500 text-black' :
                    index === 1 ? 'bg-zinc-300 text-black' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {entry.position}
                  </span>
                </div>
                <div className="col-span-6">
                  <p className={`font-body text-sm truncate ${
                    entry.user_id === user.id ? 'text-primary font-semibold' : 'text-white'
                  }`}>
                    {entry.username}
                    {entry.user_id === user.id && " (toi)"}
                  </p>
                </div>
                <div className="col-span-4 text-right">
                  <span className="font-data text-sm text-white">{entry.total_points}</span>
                  <span className="font-body text-xs text-zinc-500 ml-1">pts</span>
                </div>
              </div>
            ))}

            {leaderboard.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="font-body text-zinc-500 text-sm">
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
