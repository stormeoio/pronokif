import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Users, Plus, LogIn, Copy, Share2, Check, Trophy } from "lucide-react";

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
    
    const shareText = `Rejoins ma ligue F1 "${createdLeague.name}" sur Paddock Predictor ! Code: ${createdLeague.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Paddock Predictor",
          text: shareText,
        });
      } catch (e) {
        if (e.name !== "AbortError") {
          copyCode();
        }
      }
    } else {
      // Fallback to WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const goToDashboard = () => {
    navigate("/");
  };

  // Show success screen after creating league
  if (createdLeague) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-6">
            <Check className="w-10 h-10 text-emerald-500" strokeWidth={2} />
          </div>

          <h1 className="font-heading text-3xl uppercase tracking-tighter italic text-white mb-2">
            Ligue créée !
          </h1>
          <p className="font-body text-zinc-400 mb-8">
            Partage ce code avec tes amis
          </p>

          {/* Code Display */}
          <Card className="bg-card border-white/10 mb-6">
            <CardContent className="p-6">
              <p className="font-body text-zinc-400 text-sm mb-2">{createdLeague.name}</p>
              <div className="flex items-center justify-center gap-3">
                <span 
                  className="font-data text-4xl tracking-[0.3em] text-white"
                  data-testid="league-code"
                >
                  {createdLeague.code}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyCode}
                  className="text-zinc-400 hover:text-white"
                  data-testid="copy-code-btn"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Share Buttons */}
          <div className="flex gap-3 mb-8">
            <Button
              onClick={shareCode}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 font-heading uppercase tracking-wider text-sm"
              data-testid="share-code-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            <Button
              onClick={copyCode}
              variant="outline"
              className="flex-1 h-12 border-zinc-700 hover:bg-zinc-800 font-heading uppercase tracking-wider text-sm"
              data-testid="copy-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
          </div>

          <Button
            onClick={goToDashboard}
            className="w-full h-14 bg-primary hover:bg-red-600 font-heading uppercase tracking-wider glow-red-hover transition-all duration-300"
            data-testid="go-dashboard-btn"
          >
            Commencer à pronostiquer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Decorative */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-primary/20 border border-primary/30 mb-4">
            <Trophy className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-tighter italic text-white">
            Ta ligue
          </h1>
          <p className="font-body text-zinc-400 mt-2">
            Rejoins une ligue ou crée la tienne
          </p>
        </div>

        {/* Tabs */}
        <Card className="bg-card border-white/10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50">
              <TabsTrigger 
                value="join"
                className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-join"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Rejoindre
              </TabsTrigger>
              <TabsTrigger 
                value="create"
                className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-create"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join">
              <form onSubmit={handleJoin} data-testid="join-form">
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase tracking-tight">
                    Rejoindre une ligue
                  </CardTitle>
                  <CardDescription className="font-body">
                    Entre le code que ton ami t'a partagé
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="font-body text-zinc-400">Code d'invitation</Label>
                    <Input
                      id="code"
                      name="code"
                      type="text"
                      placeholder="ABC123"
                      required
                      maxLength={6}
                      className="bg-zinc-950/50 border-zinc-800 h-14 text-center text-2xl font-data tracking-[0.3em] uppercase focus:border-primary"
                      data-testid="join-code-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 bg-primary hover:bg-red-600 font-heading uppercase tracking-wider text-sm glow-red-hover transition-all duration-300"
                    data-testid="join-submit"
                  >
                    {isLoading ? "Connexion..." : "Rejoindre"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="create">
              <form onSubmit={handleCreate} data-testid="create-form">
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase tracking-tight">
                    Créer ta ligue
                  </CardTitle>
                  <CardDescription className="font-body">
                    Invite tes amis à te rejoindre
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-body text-zinc-400">Nom de la ligue</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Les Champions du Paddock"
                        required
                        minLength={3}
                        maxLength={30}
                        className="pl-12 bg-zinc-950/50 border-zinc-800 h-14 font-body focus:border-primary"
                        data-testid="create-name-input"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 bg-primary hover:bg-red-600 font-heading uppercase tracking-wider text-sm glow-red-hover transition-all duration-300"
                    data-testid="create-submit"
                  >
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
