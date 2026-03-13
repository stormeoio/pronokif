import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { User, ChevronRight, Zap, Trophy } from "lucide-react";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
         style={{
           background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)',
         }}>
      {/* Glow effects */}
      <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-orange-500/20 rounded-full blur-[80px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-gradient-to-b from-cyan-500 to-cyan-700 border-2 border-cyan-400 mb-4 glow-blue animate-pulse-blue">
            <Trophy className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-wider text-white text-glow-blue">
            Dernière étape !
          </h1>
          <p className="font-body text-gray-400 mt-2 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Choisis ton pseudo de pilote
            <Zap className="w-4 h-4 text-yellow-500" />
          </p>
        </div>

        {/* Card */}
        <Card className="game-card animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} data-testid="username-form">
            <CardHeader>
              <CardTitle className="font-heading text-xl uppercase tracking-tight text-cyan-400">
                Ton pseudo
              </CardTitle>
              <CardDescription className="font-body text-gray-400">
                C'est ainsi que tes amis te verront dans le classement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-body text-gray-300">Pseudo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsernameValue(e.target.value)}
                    placeholder="SpeedyMax"
                    required
                    minLength={3}
                    maxLength={20}
                    className="pl-12 bg-gray-900/50 border-gray-700 h-14 text-lg font-body focus:border-cyan-500 focus:ring-cyan-500/30"
                    data-testid="username-input"
                  />
                </div>
                <p className="text-xs text-gray-500 font-body">
                  3 à 20 caractères, lettres et chiffres uniquement
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading || username.length < 3}
                className="w-full h-14 btn-gaming font-heading uppercase tracking-wider"
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
