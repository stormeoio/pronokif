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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-sky-racing">
      {/* Asphalt track at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-asphalt" />
      <div className="absolute bottom-32 left-0 right-0 h-3 bg-kerb-stripe" />
      
      {/* Checkered pattern decoration */}
      <div className="absolute top-0 left-0 w-20 h-20 bg-checkered-small opacity-60" />
      <div className="absolute top-0 right-0 w-20 h-20 bg-checkered-small opacity-60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo Section with Chrome Frame */}
        <div className="text-center mb-8">
          {/* Chrome border frame */}
          <div className="relative inline-block">
            {/* Checkered flags */}
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 checkered-flag-left" />
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 checkered-flag-right" />
            
            {/* Main logo card */}
            <div className="card-chrome px-8 py-5 relative">
              <h1 className="font-heading text-5xl text-gold-3d tracking-wider">
                PRONOKIF
              </h1>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-3 mt-4 mb-2">
            <Gamepad2 className="w-6 h-6 text-white drop-shadow-lg" />
            <p className="font-body text-white text-lg font-bold uppercase tracking-wide drop-shadow-lg">
              Pronostics F1 entre amis
            </p>
            <Flag className="w-6 h-6 text-white drop-shadow-lg" />
          </div>
          <p className="font-body text-white/80 drop-shadow">
            Défie tes amis et prouve que tu connais la F1 !
          </p>
        </div>

        {/* Auth Card with Chrome style */}
        <div className="card-chrome p-1 overflow-hidden">
          <div className="bg-white rounded-lg">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-t-lg p-1">
                <TabsTrigger 
                  value="login" 
                  className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
                  data-testid="tab-login"
                >
                  Connexion
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md transition-all"
                  data-testid="tab-register"
                >
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={(e) => handleSubmit(e, "login")} data-testid="login-form">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-heading text-xl uppercase tracking-tight text-gray-800">
                      Bon retour pilote !
                    </CardTitle>
                    <CardDescription className="font-body text-gray-500">
                      Connecte-toi pour voir tes pronostics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="font-body text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          placeholder="ton@email.com"
                          required
                          className="pl-10 bg-gray-50 border-gray-300 h-12 font-body focus:border-blue-500 focus:ring-blue-500/30"
                          data-testid="login-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="font-body text-gray-700">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="pl-10 bg-gray-50 border-gray-300 h-12 font-body focus:border-blue-500 focus:ring-blue-500/30"
                          data-testid="login-password"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-12 btn-racing font-heading uppercase tracking-wider text-sm"
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
                    <CardTitle className="font-heading text-xl uppercase tracking-tight text-gray-800">
                      Rejoins la course !
                    </CardTitle>
                    <CardDescription className="font-body text-gray-500">
                      Crée ton compte en 30 secondes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="font-body text-gray-700">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="ton@email.com"
                          required
                          className="pl-10 bg-gray-50 border-gray-300 h-12 font-body focus:border-blue-500 focus:ring-blue-500/30"
                          data-testid="register-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="font-body text-gray-700">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          placeholder="6 caractères minimum"
                          required
                          minLength={6}
                          className="pl-10 bg-gray-50 border-gray-300 h-12 font-body focus:border-blue-500 focus:ring-blue-500/30"
                          data-testid="register-password"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-12 btn-racing font-heading uppercase tracking-wider text-sm"
                      data-testid="register-submit"
                    >
                      {isLoading ? "Création..." : "Créer mon compte"}
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6 font-body drop-shadow">
          En continuant, tu acceptes nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
}
