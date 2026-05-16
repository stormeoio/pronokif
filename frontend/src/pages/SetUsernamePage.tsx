import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { User, ChevronRight, Zap, Trophy } from "lucide-react";

export default function SetUsernamePage() {
  const [username, setUsernameValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUsername } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Ce pseudo est déjà pris";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-app-main">
      {/* Glow effects */}
      <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-blue-500/15 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-500/15 rounded-full blur-[80px]" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-400/50 mb-4 shadow-xl animate-neon">
            <Trophy className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-wider text-white">
            Dernière étape !
          </h1>
          <p className="font-body text-gray-400 mt-2 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Choisis ton pseudo de pilote
            <Zap className="w-4 h-4 text-yellow-500" />
          </p>
        </div>

        {/* Card - Arcade Style */}
        <div className="card-arcade p-1">
          <form onSubmit={handleSubmit} data-testid="username-form">
            <CardHeader className="pt-6">
              <CardTitle className="font-heading text-xl uppercase tracking-tight text-cyan-400">
                Ton pseudo
              </CardTitle>
              <CardDescription className="font-body text-gray-400">
                C'est ainsi que tes amis te verront dans le classement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-body text-gray-300 text-sm">Pseudo</Label>
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
                    className="pl-12 bg-[#0a1628] border-gray-700 h-14 text-lg font-body text-white placeholder:text-gray-500 
                              focus:border-cyan-500 focus:ring-cyan-500/30 rounded-lg"
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
                className="w-full h-14 btn-racing font-heading uppercase tracking-wider text-base"
                data-testid="username-submit"
              >
                {isLoading ? "Enregistrement..." : "C'est parti !"}
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </form>
        </div>
      </div>
    </div>
  );
}
