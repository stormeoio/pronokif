import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  User, LogOut, Trophy, Target, Users, ChevronRight,
  Plus, Settings, History, Share2, Copy, Check
} from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [leagues, setLeagues] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState({ totalPredictions: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaguesRes, predictionsRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/predictions/history")
      ]);

      setLeagues(leaguesRes.data);
      setPredictions(predictionsRes.data);
      setStats({
        totalPredictions: predictionsRes.data.length,
        totalPoints: 0 // Will be calculated from leaderboard
      });

      // Get total points from current league leaderboard
      if (user.current_league_id) {
        try {
          const leaderboardRes = await apiClient.get(`/leagues/${user.current_league_id}/leaderboard`);
          const myEntry = leaderboardRes.data.find(e => e.user_id === user.id);
          if (myEntry) {
            setStats(prev => ({ ...prev, totalPoints: myEntry.total_points }));
          }
        } catch (e) {
          // Ignore
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success("Code copié !");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async (league) => {
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur Paddock Predictor ! Code: ${league.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "Paddock Predictor", text: shareText });
      } catch (e) {
        if (e.name !== "AbortError") copyCode(league.code);
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const selectLeague = async (leagueId) => {
    try {
      await apiClient.post(`/leagues/${leagueId}/select`);
      toast.success("Ligue sélectionnée !");
      // Refresh user data
      window.location.reload();
    } catch {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton rounded-md" />
          <div className="h-32 skeleton rounded-md" />
          <div className="h-48 skeleton rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-6" data-testid="profile-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="bg-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="font-heading text-2xl uppercase tracking-tight italic text-white">
                  {user.username}
                </h1>
                <p className="font-body text-sm text-zinc-400">
                  {user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-zinc-400 hover:text-red-500"
                data-testid="logout-btn"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{stats.totalPoints}</p>
              <p className="font-body text-xs text-zinc-400 uppercase">Points totaux</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{stats.totalPredictions}</p>
              <p className="font-body text-xs text-zinc-400 uppercase">Pronostics</p>
            </CardContent>
          </Card>
        </div>

        {/* My Leagues */}
        <Card className="bg-card border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Mes ligues
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/league")}
                className="text-zinc-400 hover:text-white font-body text-sm"
                data-testid="add-league-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leagues.map((league) => (
              <div 
                key={league.id}
                className={`p-4 border-b border-white/5 ${
                  league.id === user.current_league_id ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className={`font-heading text-sm uppercase tracking-tight ${
                      league.id === user.current_league_id ? 'text-primary' : 'text-white'
                    }`}>
                      {league.name}
                      {league.id === user.current_league_id && " (active)"}
                    </p>
                    <p className="font-body text-xs text-zinc-500">
                      {league.members.length} membres • Code: <span className="font-data">{league.code}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyCode(league.code)}
                      className="text-zinc-400 hover:text-white h-8 w-8"
                    >
                      {copied === league.code ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => shareLeague(league)}
                      className="text-zinc-400 hover:text-white h-8 w-8"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {league.id !== user.current_league_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectLeague(league.id)}
                    className="w-full mt-2 border-zinc-700 text-xs"
                  >
                    Sélectionner cette ligue
                  </Button>
                )}
              </div>
            ))}

            {leagues.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="font-body text-zinc-500 text-sm">
                  Aucune ligue
                </p>
                <Button
                  onClick={() => navigate("/league")}
                  className="mt-3 bg-primary hover:bg-red-600"
                  size="sm"
                >
                  Créer / Rejoindre
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-card border-white/10">
          <CardContent className="p-0">
            <button
              onClick={() => navigate("/leaderboard")}
              className="w-full p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors"
              data-testid="nav-leaderboard"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span className="font-body text-white">Classement</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </button>
            <button
              onClick={() => navigate("/results")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              data-testid="nav-results"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <span className="font-body text-white">Historique des résultats</span>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500" />
            </button>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full h-12 border-red-500/30 text-red-500 hover:bg-red-500/10"
          data-testid="logout-btn-bottom"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>

        {/* App Info */}
        <p className="text-center text-zinc-600 text-xs font-body">
          Paddock Predictor v1.0 • Made with passion for F1
        </p>
      </div>
    </div>
  );
}
