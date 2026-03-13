import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  User, LogOut, Trophy, Target, Users, ChevronRight,
  Plus, History, Share2, Copy, Check, Zap, Star, Shield,
  Gamepad2, Medal, Edit, Crown, Globe, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { AvatarDisplay, AvatarSelector } from "../components/AvatarDisplay";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [leagues, setLeagues] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState({ totalPredictions: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [avatars, setAvatars] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [globalPosition, setGlobalPosition] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [leaguesRes, predictionsRes, avatarsRes, globalLbRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/predictions/history"),
        apiClient.get("/avatars"),
        apiClient.get("/leaderboard/global")
      ]);

      setLeagues(leaguesRes.data);
      setPredictions(predictionsRes.data);
      setAvatars(avatarsRes.data);
      setGlobalPosition(globalLbRes.data.my_position);
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
  }, [user.current_league_id, user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleAvatarSelect = async (avatarId) => {
    try {
      await apiClient.post("/user/avatar", { avatar_id: avatarId });
      if (updateUser) {
        updateUser({ avatar_id: avatarId, custom_avatar_url: null });
      }
      toast.success("Avatar mis à jour !");
      setShowAvatarModal(false);
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/user/avatar/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (updateUser) {
        updateUser({ avatar_id: null, custom_avatar_url: res.data.avatar_url });
      }
      toast.success("Photo uploadée !");
      setShowAvatarModal(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'upload");
    }
  };

  const getAvatarById = (avatarId) => {
    return avatars?.all?.find(a => a.id === avatarId) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sky-racing p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton-arcade rounded-lg" />
          <div className="h-32 skeleton-arcade rounded-lg" />
          <div className="h-48 skeleton-arcade rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-racing p-4 pt-6 pb-24" data-testid="profile-page">
      {/* Checkered decorations */}
      <div className="fixed top-0 left-0 w-16 h-16 bg-checkered-small opacity-50" />
      <div className="fixed top-0 right-0 w-16 h-16 bg-checkered-small opacity-50" />
      
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Profile Header */}
        <div className="card-chrome p-5">
          <div className="flex items-center gap-4">
            {/* Avatar with edit button */}
            <div className="relative">
              <AvatarDisplay 
                avatar={getAvatarById(user.avatar_id)} 
                customUrl={user.custom_avatar_url}
                size="xl" 
              />
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-blue-500 transition-colors"
                data-testid="edit-avatar-btn"
              >
                <Edit className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              <h1 className="font-heading text-2xl uppercase tracking-tight text-gray-800">
                {user.username}
              </h1>
              <p className="font-body text-sm text-gray-500">{user.email}</p>
              {/* Level & XP */}
              <div className="flex items-center gap-3 mt-2">
                <div className="bg-blue-100 border border-blue-300 px-3 py-1 rounded-lg">
                  <span className="font-heading text-sm text-blue-700">Niv. {user.level || 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-data text-sm text-yellow-600">{user.xp || 0} XP</span>
                </div>
              </div>
              {/* Global Ranking */}
              {globalPosition && (
                <div className="flex items-center gap-1 mt-1">
                  <Globe className="w-3 h-3 text-gray-400" />
                  <span className="font-body text-xs text-gray-500">
                    Rang mondial: <span className="text-blue-600 font-semibold">#{globalPosition}</span>
                  </span>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500" data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-gold p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-700 mx-auto mb-2" />
            <p className="font-data text-2xl text-yellow-800">{stats.totalPoints}</p>
            <p className="font-body text-xs text-yellow-700 uppercase">Points totaux</p>
          </div>
          <div className="card-racing p-4 text-center">
            <Target className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="font-data text-2xl text-white">{stats.totalPredictions}</p>
            <p className="font-body text-xs text-white/80 uppercase">Pronostics</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="card-chrome overflow-hidden">
          <div className="divide-y divide-gray-200">
            <button onClick={() => navigate("/missions")} className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors" data-testid="nav-missions">
              <div className="flex items-center gap-3">
                <Medal className="w-6 h-6 text-yellow-500" />
                <div className="text-left">
                  <span className="font-body text-gray-800 font-semibold block">Missions</span>
                  <span className="font-body text-xs text-gray-500">Gagne de l'XP</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => navigate("/minigames")} className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors" data-testid="nav-minigames">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-6 h-6 text-purple-500" />
                <div className="text-left">
                  <span className="font-body text-gray-800 font-semibold block">Mini-Jeux</span>
                  <span className="font-body text-xs text-gray-500">Reaction & Batak</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => navigate("/custom-predictions")} className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors" data-testid="nav-custom-predictions">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-pink-500" />
                <div className="text-left">
                  <span className="font-body text-gray-800 font-semibold block">Pronos Perso</span>
                  <span className="font-body text-xs text-gray-500">Crée des pronos fun</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={() => navigate("/leaderboard/global")} className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors" data-testid="nav-global-leaderboard">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-blue-500" />
                <div className="text-left">
                  <span className="font-body text-gray-800 font-semibold block">Classement Global</span>
                  <span className="font-body text-xs text-gray-500">Tous les joueurs</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* My Leagues */}
        <div className="card-chrome overflow-hidden">
          <div className="bg-kerb-stripe h-2" />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg text-gray-800 uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Mes ligues
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/league")} className="text-blue-600 font-body text-sm">
                <Plus className="w-4 h-4 mr-1" />Ajouter
              </Button>
            </div>
            
            <div className="space-y-2">
              {leagues.map((league) => (
                <div key={league.id} className={`p-3 rounded-lg ${league.id === user.current_league_id ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`font-heading text-sm uppercase ${league.id === user.current_league_id ? 'text-blue-700' : 'text-gray-700'}`}>
                        {league.name}
                        {league.id === user.current_league_id && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-yellow-500" />}
                      </p>
                      <p className="font-body text-xs text-gray-500">
                        {league.members.length} membres • Code: <span className="font-data text-blue-600">{league.code}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyCode(league.code)} className="text-gray-400 hover:text-gray-600 h-8 w-8">
                        {copied === league.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => shareLeague(league)} className="text-gray-400 hover:text-gray-600 h-8 w-8">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {league.id !== user.current_league_id && (
                    <Button onClick={() => selectLeague(league.id)} className="w-full mt-2 btn-neon text-xs h-8">
                      Sélectionner
                    </Button>
                  )}
                </div>
              ))}

              {leagues.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="font-body text-gray-400 text-sm">Aucune ligue</p>
                  <Button onClick={() => navigate("/league")} className="mt-3 btn-racing" size="sm">
                    Créer / Rejoindre
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Links */}
        <div className="card-chrome overflow-hidden divide-y divide-gray-200">
          <button onClick={() => navigate("/leaderboard")} className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors" data-testid="nav-leaderboard">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-body text-gray-700 font-semibold">Classement Ligue</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={() => navigate("/admin")} className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors" data-testid="nav-admin">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-500" />
              <span className="font-body text-gray-700 font-semibold">Administration</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Logout Button */}
        <Button onClick={handleLogout} className="w-full h-12 btn-chrome font-heading uppercase tracking-wider border-red-400 text-red-600 hover:bg-red-50" data-testid="logout-btn-bottom">
          <LogOut className="w-4 h-4 mr-2" />Déconnexion
        </Button>

        {/* App Info */}
        <p className="text-center text-white/60 text-xs font-body">
          PRONOKIF v3.0 • Made with passion for F1
        </p>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAvatarModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg uppercase text-gray-800">Choisir un Avatar</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAvatarModal(false)} className="text-gray-400">
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-4">
              <AvatarSelector
                avatars={avatars}
                selectedId={user.avatar_id}
                onSelect={handleAvatarSelect}
                customUrl={user.custom_avatar_url}
                onUpload={handleAvatarUpload}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
