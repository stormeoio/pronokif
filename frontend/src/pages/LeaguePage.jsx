import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, LogIn, Copy, Share2, Check, Trophy, Flag, Gamepad2, MessageCircle, ChevronRight, Crown, Star } from "lucide-react";

export default function LeaguePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [createdLeague, setCreatedLeague] = useState(null);
  const [copied, setCopied] = useState(false);
  const [myLeagues, setMyLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [unreadByLeague, setUnreadByLeague] = useState({});
  const { updateUser, user } = useAuth();
  const navigate = useNavigate();

  const fetchMyLeagues = useCallback(async () => {
    try {
      const [leaguesRes, unreadRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/leagues/unread-messages").catch(() => ({ data: { by_league: {} } }))
      ]);
      setMyLeagues(leaguesRes.data);
      setUnreadByLeague(unreadRes.data.by_league || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeagues(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLeagues();
  }, [fetchMyLeagues]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const code = formData.get("code").toUpperCase();

    try {
      const res = await apiClient.post("/leagues/join", { code });
      updateUser({ ...user, current_league_id: res.data.id });
      toast.success(`Tu as rejoint "${res.data.name}" !`);
      fetchMyLeagues();
      e.target.reset();
    } catch (error) {
      const message = error.response?.data?.detail || "Code invalide";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const name = formData.get("name");

    try {
      const res = await apiClient.post("/leagues", { name });
      setCreatedLeague(res.data);
      updateUser({ ...user, current_league_id: res.data.id });
      toast.success("Ligue créée !");
      fetchMyLeagues();
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la création";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code || createdLeague?.code);
      setCopied(code || createdLeague?.code);
      toast.success("Code copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareCode = async () => {
    if (!createdLeague) return;
    
    const shareText = `Rejoins ma ligue F1 "${createdLeague.name}" sur PRONOKIF ! Code: ${createdLeague.code}`;
    
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

  const selectLeague = (leagueId) => {
    updateUser({ ...user, current_league_id: leagueId });
    toast.success("Ligue sélectionnée !");
  };

  // Success screen after creating league
  if (createdLeague) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-app-main pb-24">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/15 rounded-full blur-[100px]" />
        
        <div className="w-full max-w-md text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-green-500 to-green-700 border-2 border-green-400/50 mb-6 shadow-xl glow-gold">
            <Check className="w-10 h-10 text-white" strokeWidth={2} />
          </div>

          <h1 className="font-heading text-3xl uppercase tracking-wider text-white mb-2">
            Ligue créée !
          </h1>
          <p className="font-body text-gray-400 mb-8">Partage ce code avec tes amis</p>

          <div className="card-arcade mb-6 p-6">
            <p className="font-body text-gray-400 text-sm mb-2">{createdLeague.name}</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-data text-4xl tracking-[0.3em] text-gold-glow" data-testid="league-code">
                {createdLeague.code}
              </span>
              <Button variant="ghost" size="icon" onClick={() => copyCode()} className="text-gray-400 hover:text-white hover:bg-white/10" data-testid="copy-code-btn">
                {copied === createdLeague.code ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-3 mb-8">
            <Button onClick={shareCode} className="flex-1 h-12 btn-neon font-heading uppercase tracking-wider text-sm" data-testid="share-code-btn">
              <Share2 className="w-4 h-4 mr-2" />Partager
            </Button>
            <Button onClick={() => copyCode()} className="flex-1 h-12 btn-chrome font-heading uppercase tracking-wider text-sm" data-testid="copy-btn">
              <Copy className="w-4 h-4 mr-2" />Copier
            </Button>
          </div>

          <Button onClick={() => { setCreatedLeague(null); navigate("/"); }} className="w-full h-14 btn-racing font-heading uppercase tracking-wider" data-testid="go-dashboard-btn">
            <Flag className="w-5 h-5 mr-2" />
            Commencer à pronostiquer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24">
      <div className="absolute top-20 right-10 w-32 h-32 bg-cyan-500/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-yellow-500/10 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-md mx-auto p-4">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 border-2 border-yellow-400/50 mb-4 shadow-xl animate-gold">
            <Trophy className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-2xl uppercase tracking-wider text-white">
            Mes Ligues
          </h1>
        </div>

        {/* My Leagues List */}
        {loadingLeagues ? (
          <div className="card-arcade p-8 text-center mb-6">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : myLeagues.length > 0 ? (
          <div className="space-y-3 mb-6">
            {myLeagues.map((league) => (
              <div
                key={league.id}
                className={`card-arcade p-4 transition-all ${
                  user.current_league_id === league.id 
                    ? 'border-2 border-yellow-500 bg-yellow-500/10' 
                    : 'hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      user.current_league_id === league.id 
                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-700' 
                        : 'bg-gray-800'
                    }`}>
                      {user.current_league_id === league.id ? (
                        <Star className="w-5 h-5 text-white" />
                      ) : (
                        <Users className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-white text-sm truncate">{league.name}</h3>
                        {user.current_league_id === league.id && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-heading">ACTIVE</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {league.members?.length || 0}
                        </span>
                        <span className="font-data">{league.code}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Copy code button */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); copyCode(league.code); }}
                      className="text-gray-500 hover:text-white hover:bg-white/10 h-8 w-8"
                    >
                      {copied === league.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    
                    {/* Chat button with unread badge */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); navigate(`/league/${league.id}/chat`); }}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 w-8 relative"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {unreadByLeague[league.id] > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                          {unreadByLeague[league.id] > 9 ? '9+' : unreadByLeague[league.id]}
                        </span>
                      )}
                    </Button>
                    
                    {/* Select button or go to league details */}
                    {user.current_league_id === league.id ? (
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/league/${league.id}/details`)}
                        className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white h-8 px-3"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        onClick={() => selectLeague(league.id)}
                        className="bg-gray-700 hover:bg-gray-600 text-white h-8 px-3"
                      >
                        Activer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-arcade p-6 text-center mb-6">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-body text-gray-400">Tu n'as pas encore de ligue</p>
            <p className="font-body text-gray-500 text-sm">Crée ou rejoins une ligue ci-dessous</p>
          </div>
        )}

        {/* Create / Join Tabs */}
        <div className="card-arcade overflow-hidden">
          <Tabs defaultValue="join" className="w-full">
            <div className="p-1 bg-gradient-to-r from-yellow-600/20 to-transparent">
              <TabsList className="grid w-full grid-cols-2 bg-transparent gap-1">
                <TabsTrigger value="join" 
                  className="font-heading uppercase tracking-wider text-sm text-gray-400
                            data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-yellow-700
                            data-[state=active]:text-white data-[state=active]:shadow-lg
                            rounded-lg py-2.5 transition-all" data-testid="tab-join">
                  <LogIn className="w-4 h-4 mr-2" />
                  Rejoindre
                </TabsTrigger>
                <TabsTrigger value="create" 
                  className="font-heading uppercase tracking-wider text-sm text-gray-400
                            data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-700
                            data-[state=active]:text-white data-[state=active]:shadow-lg
                            rounded-lg py-2.5 transition-all" data-testid="tab-create">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="join" className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="font-body text-gray-400 text-sm">
                  Entre le code de la ligue que tu veux rejoindre
                </p>
              </div>
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="font-heading text-xs uppercase tracking-wider text-gray-400">Code d'invitation</Label>
                  <Input
                    id="code"
                    name="code"
                    required
                    className="h-14 text-center font-data text-2xl uppercase tracking-[0.3em] bg-gray-900/60 border-gray-700
                             focus:border-yellow-500 focus:ring-yellow-500/20"
                    maxLength={6}
                    data-testid="join-code-input"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 btn-racing font-heading uppercase tracking-wider" data-testid="join-btn">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion...
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Rejoindre la ligue
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="create" className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="font-body text-gray-400 text-sm">
                  Crée ta propre ligue et invite tes amis
                </p>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-heading text-xs uppercase tracking-wider text-gray-400">Nom de la ligue</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    className="h-12 bg-gray-900/60 border-gray-700 font-body
                             focus:border-cyan-500 focus:ring-cyan-500/20"
                    placeholder="Ex: Les Champions F1"
                    data-testid="league-name-input"
                  />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 btn-neon font-heading uppercase tracking-wider" data-testid="create-btn">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création...
                    </span>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Créer ma ligue
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
