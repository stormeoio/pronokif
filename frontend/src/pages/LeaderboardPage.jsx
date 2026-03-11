import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Trophy, TrendingUp, TrendingDown, Minus, Users, 
  Share2, Copy, Check, ChevronDown
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
    
    const shareText = `Rejoins ma ligue F1 "${currentLeague.name}" sur Paddock Predictor ! Code: ${currentLeague.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "Paddock Predictor", text: shareText });
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
      <div className="min-h-screen bg-background p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton rounded" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-6" data-testid="leaderboard-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl uppercase tracking-tight italic text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              Classement
            </h1>
          </div>

          {/* League Selector */}
          {leagues.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border-zinc-700 bg-zinc-900/50"
                  data-testid="league-selector"
                >
                  {currentLeague?.name || "Sélectionner"}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                {leagues.map((league) => (
                  <DropdownMenuItem
                    key={league.id}
                    onClick={() => switchLeague(league.id)}
                    className={`font-body ${league.id === currentLeague?.id ? 'text-primary' : ''}`}
                  >
                    {league.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* League Info & Share */}
        {currentLeague && (
          <Card className="bg-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading text-lg uppercase tracking-tight text-white">
                    {currentLeague.name}
                  </p>
                  <p className="font-body text-sm text-zinc-400">
                    {currentLeague.members.length} membres • Code: <span className="font-data text-white">{currentLeague.code}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyCode}
                    className="text-zinc-400 hover:text-white"
                    data-testid="copy-code-btn"
                  >
                    {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={shareLeague}
                    className="text-zinc-400 hover:text-white"
                    data-testid="share-league-btn"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <Card className="bg-card border-white/10 overflow-hidden">
          <CardHeader className="pb-0 border-b border-white/5">
            <div className="grid grid-cols-12 gap-2 py-2 text-zinc-500 font-body text-xs uppercase tracking-wider">
              <div className="col-span-2 text-center">#</div>
              <div className="col-span-5">Joueur</div>
              <div className="col-span-3 text-right">Points</div>
              <div className="col-span-2 text-right">Évol.</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.map((entry, index) => {
              const isMe = entry.user_id === user.id;
              
              return (
                <div 
                  key={entry.user_id}
                  className={`leaderboard-row grid grid-cols-12 gap-2 items-center p-4 border-b border-white/5 ${
                    isMe ? 'bg-primary/10' : ''
                  }`}
                  data-testid={`leaderboard-row-${index}`}
                >
                  {/* Position */}
                  <div className="col-span-2 flex justify-center">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-sm font-heading text-lg ${
                      index === 0 ? 'bg-amber-500 text-black' :
                      index === 1 ? 'bg-zinc-300 text-black' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-zinc-800 text-zinc-300'
                    }`}>
                      {entry.position}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="col-span-5">
                    <p className={`font-body truncate ${isMe ? 'text-primary font-semibold' : 'text-white'}`}>
                      {entry.username}
                      {isMe && " (toi)"}
                    </p>
                    {entry.last_race_points > 0 && (
                      <p className="font-data text-xs text-emerald-500">
                        +{entry.last_race_points} dernière course
                      </p>
                    )}
                  </div>

                  {/* Points */}
                  <div className="col-span-3 text-right">
                    <span className="font-data text-lg text-white">{entry.total_points}</span>
                    <span className="font-body text-xs text-zinc-500 ml-1">pts</span>
                  </div>

                  {/* Evolution */}
                  <div className="col-span-2 flex justify-end">
                    {entry.position_change > 0 && (
                      <span className="flex items-center text-emerald-500 font-data text-sm">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +{entry.position_change}
                      </span>
                    )}
                    {entry.position_change < 0 && (
                      <span className="flex items-center text-red-500 font-data text-sm">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        {entry.position_change}
                      </span>
                    )}
                    {entry.position_change === 0 && (
                      <span className="flex items-center text-zinc-500 font-data text-sm">
                        <Minus className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {leaderboard.length === 0 && (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <p className="font-heading text-lg uppercase text-zinc-400 mb-2">
                  Aucun classement
                </p>
                <p className="font-body text-sm text-zinc-500 mb-4">
                  Invite tes amis pour commencer la compétition !
                </p>
                {currentLeague && (
                  <Button
                    onClick={shareLeague}
                    className="bg-primary hover:bg-red-600"
                    data-testid="invite-friends-btn"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Inviter des amis
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Join League */}
        {leagues.length === 0 && (
          <Card className="bg-card border-white/10">
            <CardContent className="p-6 text-center">
              <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="font-heading text-lg uppercase text-white mb-2">
                Aucune ligue
              </p>
              <p className="font-body text-sm text-zinc-400 mb-4">
                Crée ou rejoins une ligue pour voir le classement
              </p>
              <Button
                onClick={() => navigate("/league")}
                className="bg-primary hover:bg-red-600"
              >
                Créer / Rejoindre une ligue
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
