import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "@/lib/auth";

const HeroScene = lazy(() => import("../components/three/HeroScene"));

// Hero banner with F1 car (no text - we overlay via CSS)
const HERO_BANNER =
  "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/d9b6f1a65194f54bbc34bb7e15e4af8069ab64dab312c6c3be1db79b2ca45259.png";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, type: "login" | "register") => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const user =
        type === "login" ? await login(email, password) : await register(email, password);

      toast.success(type === "login" ? "Connexion réussie !" : "Compte créé !");

      if (!user.username) {
        navigate("/set-username");
      } else if (!user.current_league_id) {
        navigate("/league");
      } else {
        navigate("/");
      }
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Une erreur est survenue";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-main relative overflow-hidden">
      {/* 3D Hero Scene - Top Section */}
      <div className="relative w-full h-64 flex-shrink-0">
        <Suspense
          fallback={
            <img
              src={HERO_BANNER}
              alt="PRONOKIF - Pronostics F1"
              className="w-full h-full object-cover object-top"
            />
          }
        >
          <HeroScene className="absolute inset-0" />
        </Suspense>

        {/* Title overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <motion.h1
            className="font-heading text-5xl text-white uppercase tracking-widest text-glow-orange"
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            PRONOKIF
          </motion.h1>
          <motion.p
            className="font-body text-cyan-300/80 text-xs uppercase tracking-[0.2em] mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            Fantasy F1 Predictions
          </motion.p>
        </div>

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050a14] to-transparent z-5" />
      </div>

      {/* Animated kerb stripe separator */}
      <motion.div
        className="h-[3px] bg-gradient-to-r from-red-600 via-white to-red-600 flex-shrink-0 -mt-1 relative z-10"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      />

      {/* Content Section */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-start px-4 pt-6 pb-8 relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {/* Tagline */}
        <div className="text-center mb-6">
          <p className="font-body text-cyan-400 text-sm uppercase tracking-widest mb-1">
            Pronostics F1 entre amis
          </p>
          <p className="font-body text-gray-400 text-sm">
            Défie tes amis et prouve que tu connais la F1 !
          </p>
        </div>

        {/* Auth Card - Arcade Style */}
        <div className="w-full max-w-md">
          <div className="card-arcade overflow-hidden">
            <Tabs defaultValue="login" className="w-full">
              {/* Tab Headers */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-1">
                <TabsList className="grid w-full grid-cols-2 bg-transparent gap-1">
                  <TabsTrigger
                    value="login"
                    className="font-heading uppercase tracking-wider text-sm text-gray-400 
                              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700
                              data-[state=active]:text-white data-[state=active]:shadow-lg
                              rounded-lg py-3 transition-all"
                    data-testid="tab-login"
                  >
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="font-heading uppercase tracking-wider text-sm text-gray-400 
                              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700
                              data-[state=active]:text-white data-[state=active]:shadow-lg
                              rounded-lg py-3 transition-all"
                    data-testid="tab-register"
                  >
                    Inscription
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Login Form */}
              <TabsContent value="login" className="mt-0">
                <form onSubmit={(e) => handleSubmit(e, "login")} data-testid="login-form">
                  <CardHeader className="pb-4 pt-6">
                    <CardTitle className="font-heading text-xl uppercase tracking-tight text-white">
                      Bon retour pilote !
                    </CardTitle>
                    <CardDescription className="font-body text-gray-400">
                      Connecte-toi pour voir tes pronostics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="font-body text-gray-300 text-sm">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          placeholder="ton@email.com"
                          required
                          className="pl-10 bg-[#0a1628] border-gray-700 h-12 font-body text-white placeholder:text-gray-500
                                    focus:border-blue-500 focus:ring-blue-500/30 rounded-lg"
                          data-testid="login-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="font-body text-gray-300 text-sm">
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="pl-10 bg-[#0a1628] border-gray-700 h-12 font-body text-white placeholder:text-gray-500
                                    focus:border-blue-500 focus:ring-blue-500/30 rounded-lg"
                          data-testid="login-password"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 btn-racing font-heading uppercase tracking-wider text-base mt-2"
                      data-testid="login-submit"
                    >
                      {isLoading ? "Connexion..." : "Se connecter"}
                      <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register" className="mt-0">
                <form onSubmit={(e) => handleSubmit(e, "register")} data-testid="register-form">
                  <CardHeader className="pb-4 pt-6">
                    <CardTitle className="font-heading text-xl uppercase tracking-tight text-white">
                      Rejoins la course !
                    </CardTitle>
                    <CardDescription className="font-body text-gray-400">
                      Crée ton compte en 30 secondes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="font-body text-gray-300 text-sm">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="ton@email.com"
                          required
                          className="pl-10 bg-[#0a1628] border-gray-700 h-12 font-body text-white placeholder:text-gray-500
                                    focus:border-blue-500 focus:ring-blue-500/30 rounded-lg"
                          data-testid="register-email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="register-password"
                        className="font-body text-gray-300 text-sm"
                      >
                        Mot de passe
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          placeholder="6 caractères minimum"
                          required
                          minLength={6}
                          className="pl-10 bg-[#0a1628] border-gray-700 h-12 font-body text-white placeholder:text-gray-500
                                    focus:border-blue-500 focus:ring-blue-500/30 rounded-lg"
                          data-testid="register-password"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-14 btn-racing font-heading uppercase tracking-wider text-base mt-2"
                      data-testid="register-submit"
                    >
                      {isLoading ? "Création..." : "Créer mon compte"}
                      <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6 font-body">
          En continuant, tu acceptes nos conditions d'utilisation
        </p>
      </motion.div>
    </div>
  );
}
