import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, LogIn, Copy, Share2, Check, Trophy, Flag, Gamepad2 } from "lucide-react";

export default function LeaguePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [createdLeague, setCreatedLeague] = useState(null);
  const [copied, setCopied] = useState(false);
  const { updateUser, user } = useAuth();
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const code = formData.get("code").toUpperCase();

    try {
      const res = await apiClient.post("/leagues/join", { code });
      updateUser({ ...user, current_league_id: res.data.id });
      toast.success(`Tu as rejoint "${res.data.name}" !`);
      navigate("/");
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
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la création";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    if (!createdLeague) return;
    try {
      await navigator.clipboard.writeText(createdLeague.code);
      setCopied(true);
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

  // Success screen after creating league
  if (createdLeague) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4"
           style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="w-full max-w-md text-center animate-slide-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-gradient-to-b from-green-500 to-green-700 border-2 border-green-400 mb-6 glow-green">
            <Check className="w-10 h-10 text-white" strokeWidth={2} />
          </div>

          <h1 className="font-heading text-3xl uppercase tracking-wider text-white text-glow-orange mb-2">
            Ligue créée !
          </h1>
          <p className="font-body text-gray-400 mb-8">Partage ce code avec tes amis</p>

          <Card className="game-card mb-6">
            <CardContent className="p-6">
              <p className="font-body text-gray-400 text-sm mb-2">{createdLeague.name}</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-data text-4xl tracking-[0.3em] text-yellow-500 text-glow-yellow" data-testid="league-code">
                  {createdLeague.code}
                </span>
                <Button variant="ghost" size="icon" onClick={copyCode} className="text-gray-400 hover:text-white" data-testid="copy-code-btn">
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 mb-8">
            <Button onClick={shareCode} className="flex-1 h-12 btn-gaming-blue font-heading uppercase tracking-wider text-sm" data-testid="share-code-btn">
              <Share2 className="w-4 h-4 mr-2" />Partager
            </Button>
            <Button onClick={copyCode} variant="outline" className="flex-1 h-12 border-gray-700 hover:bg-gray-800 font-heading uppercase tracking-wider text-sm" data-testid="copy-btn">
              <Copy className="w-4 h-4 mr-2" />Copier
            </Button>
          </div>

          <Button onClick={() => navigate("/")} className="w-full h-14 btn-gaming font-heading uppercase tracking-wider" data-testid="go-dashboard-btn">
            <Flag className="w-5 h-5 mr-2" />
            Commencer à pronostiquer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
         style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      <div className="absolute top-20 right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8 animate-slide-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-b from-orange-500 to-orange-700 border-2 border-orange-400 mb-4 glow-orange">
            <Trophy className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-wider text-white text-glow-orange">
            Ta ligue
          </h1>
          <p className="font-body text-gray-400 mt-2 flex items-center justify-center gap-2">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            Rejoins une ligue ou crée la tienne
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
          </p>
        </div>

        <Card className="game-card animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-700 rounded-lg p-1">
              <TabsTrigger value="join" className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-gradient-to-b data-[state=active]:from-orange-500 data-[state=active]:to-orange-700 data-[state=active]:text-white rounded-md" data-testid="tab-join">
                <LogIn className="w-4 h-4 mr-2" />Rejoindre
              </TabsTrigger>
              <TabsTrigger value="create" className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-gradient-to-b data-[state=active]:from-orange-500 data-[state=active]:to-orange-700 data-[state=active]:text-white rounded-md" data-testid="tab-create">
                <Plus className="w-4 h-4 mr-2" />Créer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join">
              <form onSubmit={handleJoin} data-testid="join-form">
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase tracking-tight text-cyan-400">Rejoindre une ligue</CardTitle>
                  <CardDescription className="font-body text-gray-400">Entre le code que ton ami t'a partagé</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="font-body text-gray-300">Code d'invitation</Label>
                    <Input id="code" name="code" type="text" placeholder="ABC123" required maxLength={6}
                           className="bg-gray-900/50 border-gray-700 h-14 text-center text-2xl font-data tracking-[0.3em] uppercase focus:border-orange-500"
                           data-testid="join-code-input" />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 btn-gaming font-heading uppercase tracking-wider text-sm" data-testid="join-submit">
                    {isLoading ? "Connexion..." : "Rejoindre"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="create">
              <form onSubmit={handleCreate} data-testid="create-form">
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase tracking-tight text-cyan-400">Créer ta ligue</CardTitle>
                  <CardDescription className="font-body text-gray-400">Invite tes amis à te rejoindre</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-body text-gray-300">Nom de la ligue</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input id="name" name="name" type="text" placeholder="Les Champions du Paddock" required minLength={3} maxLength={30}
                             className="pl-12 bg-gray-900/50 border-gray-700 h-14 font-body focus:border-orange-500"
                             data-testid="create-name-input" />
                    </div>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-12 btn-gaming font-heading uppercase tracking-wider text-sm" data-testid="create-submit">
                    {isLoading ? "Création..." : "Créer ma ligue"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
