import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Flag, Mail, Lock, ChevronRight, Gamepad2 } from "lucide-react";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const user = type === "login" 
        ? await login(email, password)
        : await register(email, password);

      toast.success(type === "login" ? "Connexion réussie !" : "Compte créé !");
      
      if (!user.username) {
        navigate("/set-username");
      } else if (!user.current_league_id) {
        navigate("/league");
      } else {
        navigate("/");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Une erreur est survenue";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)',
      }}
    >
      {/* Racing track background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-500/20 to-transparent" />
      </div>

      {/* Animated glow effects */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-in">
          {/* Main title with gaming frame */}
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 blur-lg opacity-50" />
            <div className="relative bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 px-8 py-4 border-4 border-orange-500 rounded-lg"
                 style={{
                   boxShadow: '0 0 30px rgba(255, 102, 0, 0.5), inset 0 2px 0 rgba(255,255,255,0.2)'
                 }}>
              <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-wider text-white text-glow-orange">
                PRONOKIF
              </h1>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
            <p className="font-body text-cyan-400 text-lg font-semibold uppercase tracking-wide">
              Pronostics F1
            </p>
            <Flag className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="font-body text-gray-400">
            Défie tes amis et prouve que tu connais la F1 !
          </p>
        </div>

        {/* Auth Card */}
        <Card className="game-card animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="login" 
                className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-gradient-to-b data-[state=active]:from-orange-500 data-[state=active]:to-orange-700 data-[state=active]:text-white rounded-md transition-all"
                data-testid="tab-login"
              >
                Connexion
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-gradient-to-b data-[state=active]:from-orange-500 data-[state=active]:to-orange-700 data-[state=active]:text-white rounded-md transition-all"
                data-testid="tab-register"
              >
                Inscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, "login")} data-testid="login-form">
                <CardHeader className="pb-4">
                  <CardTitle className="font-heading text-xl uppercase tracking-tight text-cyan-400">
                    Bon retour pilote !
                  </CardTitle>
                  <CardDescription className="font-body text-gray-400">
                    Connecte-toi pour voir tes pronostics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-body text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="ton@email.com"
                        required
                        className="pl-10 bg-gray-900/50 border-gray-700 h-12 font-body focus:border-orange-500 focus:ring-orange-500/30"
                        data-testid="login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="font-body text-gray-300">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pl-10 bg-gray-900/50 border-gray-700 h-12 font-body focus:border-orange-500 focus:ring-orange-500/30"
                        data-testid="login-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 btn-gaming font-heading uppercase tracking-wider text-sm"
                    data-testid="login-submit"
                  >
                    {isLoading ? "Connexion..." : "Se connecter"}
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={(e) => handleSubmit(e, "register")} data-testid="register-form">
                <CardHeader className="pb-4">
                  <CardTitle className="font-heading text-xl uppercase tracking-tight text-cyan-400">
                    Rejoins la course !
                  </CardTitle>
                  <CardDescription className="font-body text-gray-400">
                    Crée ton compte en 30 secondes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="font-body text-gray-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="ton@email.com"
                        required
                        className="pl-10 bg-gray-900/50 border-gray-700 h-12 font-body focus:border-orange-500 focus:ring-orange-500/30"
                        data-testid="register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="font-body text-gray-300">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        placeholder="6 caractères minimum"
                        required
                        minLength={6}
                        className="pl-10 bg-gray-900/50 border-gray-700 h-12 font-body focus:border-orange-500 focus:ring-orange-500/30"
                        data-testid="register-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 btn-gaming font-heading uppercase tracking-wider text-sm"
                    data-testid="register-submit"
                  >
                    {isLoading ? "Création..." : "Créer mon compte"}
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs mt-6 font-body">
          En continuant, tu acceptes nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
}
