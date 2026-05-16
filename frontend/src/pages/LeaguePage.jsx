import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, LogIn, Trophy } from "lucide-react";

import LeagueCreatedScreen from "./leagues/LeagueCreatedScreen";
import LeagueList from "./leagues/LeagueList";

export default function LeaguePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [createdLeague, setCreatedLeague] = useState(null);
  const [copied, setCopied] = useState(false);
  const { updateUser, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Data queries ──────────────────────────────────────────
  const { data: myLeagues = [], isLoading: loadingLeagues } = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: async () => (await apiClient.get("/leagues/my")).data,
  });

  const { data: unreadByLeague = {} } = useQuery({
    queryKey: ["/leagues/unread-messages"],
    queryFn: async () => {
      const res = await apiClient.get("/leagues/unread-messages").catch(() => ({ data: { by_league: {} } }));
      return res.data.by_league || {};
    },
  });

  const invalidateLeagues = () => {
    queryClient.invalidateQueries({ queryKey: ["/leagues/my"] });
    queryClient.invalidateQueries({ queryKey: ["/leagues/unread-messages"] });
  };

  // ── Actions ───────────────────────────────────────────────
  const handleJoin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.target);
    const code = formData.get("code").toUpperCase();

    try {
      const res = await apiClient.post("/leagues/join", { code });
      updateUser({ ...user, current_league_id: res.data.id });
      toast.success(`Tu as rejoint "${res.data.name}" !`);
      invalidateLeagues();
      e.target.reset();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Code invalide");
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
      toast.success("Ligue creee !");
      invalidateLeagues();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la creation");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code || createdLeague?.code);
      setCopied(code || createdLeague?.code);
      toast.success("Code copie !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async (league) => {
    const shareUrl = `${window.location.origin}/join/${league.code}`;
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur PRONOKIF !`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `PRONOKIF - ${league.name}`, text: shareText, url: shareUrl });
      } catch (e) {
        if (e.name !== "AbortError") copyCode(league.code);
      }
    } else {
      const whatsappText = `${shareText}\n\n${shareUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`, "_blank");
    }
  };

  const selectLeague = (leagueId) => {
    updateUser({ ...user, current_league_id: leagueId });
    toast.success("Ligue selectionnee !");
  };

  // ── Created league success screen ────────────────────────
  if (createdLeague) {
    return (
      <LeagueCreatedScreen
        league={createdLeague}
        copied={copied}
        onCopyCode={() => copyCode()}
        onShareCode={() => shareLeague(createdLeague)}
        onDone={() => { setCreatedLeague(null); navigate("/"); }}
      />
    );
  }

  // ── Main page ────────────────────────────────────────────
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
        <LeagueList
          leagues={myLeagues}
          loading={loadingLeagues}
          userId={user.id}
          currentLeagueId={user.current_league_id}
          copied={copied}
          unreadByLeague={unreadByLeague}
          onCopyCode={copyCode}
          onShareLeague={shareLeague}
          onSelectLeague={selectLeague}
        />

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
                  Creer
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
                  <Input id="code" name="code" required
                    className="h-14 text-center font-data text-2xl uppercase tracking-[0.3em] bg-gray-900/60 border-gray-700
                             focus:border-yellow-500 focus:ring-yellow-500/20"
                    maxLength={6} data-testid="join-code-input" />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 btn-racing font-heading uppercase tracking-wider" data-testid="join-btn">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connexion...
                    </span>
                  ) : (
                    <><LogIn className="w-5 h-5 mr-2" />Rejoindre la ligue</>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="create" className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="font-body text-gray-400 text-sm">
                  Cree ta propre ligue et invite tes amis
                </p>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-heading text-xs uppercase tracking-wider text-gray-400">Nom de la ligue</Label>
                  <Input id="name" name="name" required
                    className="h-12 bg-gray-900/60 border-gray-700 font-body
                             focus:border-cyan-500 focus:ring-cyan-500/20"
                    placeholder="Ex: Les Champions F1" data-testid="league-name-input" />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full h-14 btn-neon font-heading uppercase tracking-wider" data-testid="create-btn">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creation...
                    </span>
                  ) : (
                    <><Plus className="w-5 h-5 mr-2" />Creer ma ligue</>
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
