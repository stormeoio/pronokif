import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Flag, Mail, Lock, ChevronRight } from "lucide-react";

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
        backgroundImage: `url('https://images.unsplash.com/photo-1749952648856-a4cf58358d84?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwzfHxGMSUyMHJhY2UlMjBjYXIlMjBuaWdodCUyMHRyYWNrJTIwYWN0aW9ufGVufDB8fHx8MTc3MzIxNzIwMXww&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/95" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-primary/20 border border-primary/30 mb-4">
            <Flag className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-4xl uppercase tracking-tighter italic text-white">
            Paddock
          </h1>
          <p className="font-heading text-xl uppercase tracking-tight text-primary italic">
            Predictor
          </p>
          <p className="font-body text-zinc-400 mt-2 text-sm">
            Défie tes amis sur les pronostics F1
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-card/80 backdrop-blur-md border-white/10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50">
              <TabsTrigger 
                value="login" 
                className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-login"
              >
                Connexion
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="font-heading uppercase tracking-wider text-sm data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-register"
              >
                Inscription
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={(e) => handleSubmit(e, "login")} data-testid="login-form">
                <CardHeader className="pb-4">
                  <CardTitle className="font-heading text-xl uppercase tracking-tight">
                    Bon retour !
                  </CardTitle>
                  <CardDescription className="font-body">
                    Connecte-toi pour voir tes pronostics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-body text-zinc-400">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="ton@email.com"
                        required
                        className="pl-10 bg-zinc-950/50 border-zinc-800 h-12 font-body focus:border-primary"
                        data-testid="login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="font-body text-zinc-400">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="pl-10 bg-zinc-950/50 border-zinc-800 h-12 font-body focus:border-primary"
                        data-testid="login-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 bg-primary hover:bg-red-600 font-heading uppercase tracking-wider text-sm glow-red-hover transition-all duration-300"
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
                  <CardTitle className="font-heading text-xl uppercase tracking-tight">
                    Rejoins la course !
                  </CardTitle>
                  <CardDescription className="font-body">
                    Crée ton compte en 30 secondes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="font-body text-zinc-400">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="ton@email.com"
                        required
                        className="pl-10 bg-zinc-950/50 border-zinc-800 h-12 font-body focus:border-primary"
                        data-testid="register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="font-body text-zinc-400">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        placeholder="6 caractères minimum"
                        required
                        minLength={6}
                        className="pl-10 bg-zinc-950/50 border-zinc-800 h-12 font-body focus:border-primary"
                        data-testid="register-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-12 bg-primary hover:bg-red-600 font-heading uppercase tracking-wider text-sm glow-red-hover transition-all duration-300"
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
        <p className="text-center text-zinc-600 text-xs mt-6 font-body">
          En continuant, tu acceptes nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
}
