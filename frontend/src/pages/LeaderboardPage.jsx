import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Users, 
  Share2, Copy, Check, ChevronDown, MessageCircle, Plus
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [leaderboard, setLeaderboard] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [currentLeague, setCurrentLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const leaguesRes = await apiClient.get("/leagues/my");
      setLeagues(leaguesRes.data);

      if (user.current_league_id) {
        const league = leaguesRes.data.find(l => l.id === user.current_league_id);
        setCurrentLeague(league);
        
        const leaderboardRes = await apiClient.get(`/leagues/${user.current_league_id}/leaderboard`);
        setLeaderboard(leaderboardRes.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const switchLeague = async (leagueId) => {
    try {
      await apiClient.post(`/leagues/${leagueId}/select`);
      const league = leagues.find(l => l.id === leagueId);
      setCurrentLeague(league);
      
      const leaderboardRes = await apiClient.get(`/leagues/${leagueId}/leaderboard`);
      setLeaderboard(leaderboardRes.data);
      
      toast.success(`Ligue "${league.name}" sélectionnée`);
    } catch (e) {
      toast.error("Erreur lors du changement de ligue");
    }
  };

  const copyCode = async () => {
    if (!currentLeague) return;
    try {
      await navigator.clipboard.writeText(currentLeague.code);
      setCopied(true);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async () => {
    if (!currentLeague) return;
    
    const shareText = `Rejoins ma ligue F1 "${currentLeague.name}" sur PRONOKIF ! Code: ${currentLeague.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "PRONOKIF", text: shareText });
      } catch (e) {
        if (e.name !== "AbortError") copyCode();
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-arcade rounded" />
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 skeleton-arcade rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main p-4 pt-6 pb-24" data-testid="leaderboard-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl uppercase tracking-tight text-yellow-500 flex items-center gap-2">
            <Trophy className="w-7 h-7" />
            Classement
          </h1>

          {leagues.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-gray-700 bg-gray-900/50 font-body" data-testid="league-selector">
                  {currentLeague?.name || "Sélectionner"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                {leagues.map((league) => (
                  <DropdownMenuItem
                    key={league.id}
                    onClick={() => switchLeague(league.id)}
                    className={`font-body ${league.id === currentLeague?.id ? 'text-orange-500' : ''}`}
                  >
                    {league.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* League Info */}
        {currentLeague && (
          <div className="card-arcade p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-lg uppercase tracking-tight text-cyan-400">
                  {currentLeague.name}
                </p>
                <p className="font-body text-sm text-gray-400">
                  {currentLeague.members.length} membres • Code: <span className="font-data text-yellow-500">{currentLeague.code}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(`/league/${currentLeague.id}/chat`)} 
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" 
                  data-testid="chat-btn"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/league")} 
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10" 
                  data-testid="add-league-btn"
                >
                  <Plus className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={copyCode} className="text-gray-400 hover:text-white hover:bg-white/10" data-testid="copy-code-btn">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={shareLeague} className="text-gray-400 hover:text-white hover:bg-white/10" data-testid="share-league-btn">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="card-arcade overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-600/20 to-transparent px-4 py-3 border-b border-gray-700/50">
            <div className="grid grid-cols-12 gap-2 text-gray-400 font-body text-xs uppercase tracking-wider">
              <div className="col-span-2 text-center">#</div>
              <div className="col-span-5">Joueur</div>
              <div className="col-span-3 text-right">Points</div>
              <div className="col-span-2 text-right">Évol.</div>
            </div>
          </div>
          <div>
            {leaderboard.map((entry, index) => {
              const isMe = entry.user_id === user.id;
              
              return (
                <div 
                  key={entry.user_id}
                  onClick={() => navigate(`/profile/${entry.user_id}`)}
                  className={`grid grid-cols-12 gap-2 items-center p-4 border-b border-gray-800 transition-colors hover:bg-white/5 cursor-pointer ${
                    isMe ? 'bg-orange-500/10' : ''
                  }`}
                  data-testid={`leaderboard-row-${index}`}
                >
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-heading text-lg ${
                      index === 0 ? 'position-1' :
                      index === 1 ? 'position-2' :
                      index === 2 ? 'position-3' :
                      'bg-gray-800 text-gray-300 border border-gray-700'
                    }`}>
                      {entry.position}
                    </span>
                  </div>

                  <div className="col-span-5">
                    <p className={`font-body truncate ${isMe ? 'text-cyan-400 font-semibold' : 'text-white'}`}>
                      {entry.username}
                      {isMe && " (toi)"}
                    </p>
                    {entry.last_race_points > 0 && (
                      <p className="font-data text-xs text-green-400">+{entry.last_race_points} dernière course</p>
                    )}
                  </div>

                  <div className="col-span-3 text-right">
                    <span className="font-data text-lg text-white">{entry.total_points}</span>
                    <span className="font-body text-xs text-gray-500 ml-1">pts</span>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    {entry.position_change > 0 && (
                      <span className="flex items-center text-green-400 font-data text-sm bg-green-500/20 px-2 py-1 rounded">
                        <TrendingUp className="w-3 h-3 mr-1" />+{entry.position_change}
                      </span>
                    )}
                    {entry.position_change < 0 && (
                      <span className="flex items-center text-red-400 font-data text-sm bg-red-500/20 px-2 py-1 rounded">
                        <TrendingDown className="w-3 h-3 mr-1" />{entry.position_change}
                      </span>
                    )}
                    {entry.position_change === 0 && (
                      <span className="flex items-center text-gray-500 font-data text-sm">
                        <Minus className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {leaderboard.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-heading text-lg uppercase text-gray-400 mb-2">Aucun classement</p>
                <p className="font-body text-sm text-gray-500 mb-4">Invite tes amis pour commencer !</p>
                {currentLeague && (
                  <Button onClick={shareLeague} className="btn-racing" data-testid="invite-friends-btn">
                    <Share2 className="w-4 h-4 mr-2" />Inviter des amis
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="h-2 bg-kerb-stripe" />
        </div>

        {leagues.length === 0 && (
          <div className="card-arcade p-6 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-heading text-lg uppercase text-white mb-2">Aucune ligue</p>
            <p className="font-body text-sm text-gray-400 mb-4">Crée ou rejoins une ligue</p>
            <Button onClick={() => navigate("/league")} className="btn-racing">
              Créer / Rejoindre
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
