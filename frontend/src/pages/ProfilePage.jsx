import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  User, LogOut, Trophy, Target, Users, ChevronRight,
  Plus, History, Share2, Copy, Check, Zap, Star, Shield
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
      setStats({ totalPredictions: predictionsRes.data.length, totalPoints: 0 });

      if (user.current_league_id) {
        try {
          const leaderboardRes = await apiClient.get(`/leagues/${user.current_league_id}/leaderboard`);
          const myEntry = leaderboardRes.data.find(e => e.user_id === user.id);
          if (myEntry) {
            setStats(prev => ({ ...prev, totalPoints: myEntry.total_points }));
          }
        } catch (e) {}
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
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur PRONOKIF ! Code: ${league.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "PRONOKIF", text: shareText });
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
      window.location.reload();
    } catch {
      toast.error("Erreur");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton-gaming rounded-md" />
          <div className="h-32 skeleton-gaming rounded-md" />
          <div className="h-48 skeleton-gaming rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-6" data-testid="profile-page"
         style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="game-card racing-stripe">
          <CardContent className="p-6 pt-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-b from-orange-500 to-orange-700 border-2 border-orange-400 flex items-center justify-center glow-orange">
                <span className="font-heading text-3xl text-white">
                  {user.username?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="font-heading text-2xl uppercase tracking-tight text-white">
                  {user.username}
                </h1>
                <p className="font-body text-sm text-gray-400">{user.email}</p>
                {/* Level & XP */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="level-badge px-3 py-1 rounded-lg">
                    <span className="font-heading text-sm text-cyan-400">Niv. {user.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-data text-sm text-yellow-500">XP {user.xp || 0}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500" data-testid="logout-btn">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="game-card">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{stats.totalPoints}</p>
              <p className="font-body text-xs text-gray-400 uppercase">Points totaux</p>
            </CardContent>
          </Card>
          <Card className="game-card">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{stats.totalPredictions}</p>
              <p className="font-body text-xs text-gray-400 uppercase">Pronostics</p>
            </CardContent>
          </Card>
        </div>

        {/* My Leagues */}
        <Card className="game-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2 text-cyan-400">
                <Users className="w-5 h-5" />Mes ligues
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/league")} className="text-orange-500 hover:text-orange-400 font-body text-sm" data-testid="add-league-btn">
                <Plus className="w-4 h-4 mr-1" />Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leagues.map((league) => (
              <div key={league.id} className={`p-4 border-b border-gray-800 ${league.id === user.current_league_id ? 'bg-orange-500/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className={`font-heading text-sm uppercase tracking-tight ${league.id === user.current_league_id ? 'text-orange-400' : 'text-white'}`}>
                      {league.name}
                      {league.id === user.current_league_id && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-current" />}
                    </p>
                    <p className="font-body text-xs text-gray-500">
                      {league.members.length} membres • Code: <span className="font-data text-yellow-500">{league.code}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyCode(league.code)} className="text-gray-400 hover:text-white h-8 w-8">
                      {copied === league.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => shareLeague(league)} className="text-gray-400 hover:text-white h-8 w-8">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {league.id !== user.current_league_id && (
                  <Button variant="outline" size="sm" onClick={() => selectLeague(league.id)} className="w-full mt-2 border-gray-700 text-xs font-body">
                    Sélectionner cette ligue
                  </Button>
                )}
              </div>
            ))}

            {leagues.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-body text-gray-500 text-sm">Aucune ligue</p>
                <Button onClick={() => navigate("/league")} className="mt-3 btn-gaming" size="sm">
                  Créer / Rejoindre
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="game-card">
          <CardContent className="p-0">
            <button onClick={() => navigate("/leaderboard")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-leaderboard">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-body text-white">Classement</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/results")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-results">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-cyan-500" />
                <span className="font-body text-white">Historique des résultats</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/admin")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-admin">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-orange-500" />
                <span className="font-body text-white">Administration</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button variant="outline" onClick={handleLogout} className="w-full h-12 border-red-500/30 text-red-500 hover:bg-red-500/10 font-heading uppercase tracking-wider" data-testid="logout-btn-bottom">
          <LogOut className="w-4 h-4 mr-2" />Déconnexion
        </Button>

        {/* App Info */}
        <p className="text-center text-gray-600 text-xs font-body">
          PRONOKIF v1.0 • Made with passion for F1
        </p>
      </div>
    </div>
  );
}
