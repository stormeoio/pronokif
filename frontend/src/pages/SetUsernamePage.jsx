import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { User, ChevronRight, Sparkles } from "lucide-react";

export default function SetUsernamePage() {
  const [username, setUsernameValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUsername } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (username.length < 3) {
      toast.error("Le pseudo doit avoir au moins 3 caractères");
      return;
    }

    setIsLoading(true);
    try {
      await setUsername(username);
      toast.success("Pseudo enregistré !");
      navigate("/league");
    } catch (error) {
      const message = error.response?.data?.detail || "Ce pseudo est déjà pris";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 border border-primary/30 mb-4 animate-pulse-glow">
            <Sparkles className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-tighter italic text-white">
            Dernière étape !
          </h1>
          <p className="font-body text-zinc-400 mt-2">
            Choisis ton pseudo de pilote
          </p>
        </div>

        {/* Card */}
        <Card className="bg-card border-white/10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} data-testid="username-form">
            <CardHeader>
              <CardTitle className="font-heading text-xl uppercase tracking-tight">
                Ton pseudo
              </CardTitle>
              <CardDescription className="font-body">
                C'est ainsi que tes amis te verront dans le classement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-body text-zinc-400">Pseudo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsernameValue(e.target.value)}
                    placeholder="SpeedyMax"
                    required
                    minLength={3}
                    maxLength={20}
                    className="pl-12 bg-zinc-950/50 border-zinc-800 h-14 text-lg font-body focus:border-primary"
                    data-testid="username-input"
                  />
                </div>
                <p className="text-xs text-zinc-500 font-body">
                  3 à 20 caractères, lettres et chiffres uniquement
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || username.length < 3}
                className="w-full h-14 bg-primary hover:bg-red-600 font-heading uppercase tracking-wider glow-red-hover transition-all duration-300"
                data-testid="username-submit"
              >
                {isLoading ? "Enregistrement..." : "C'est parti !"}
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
