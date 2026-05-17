import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { User, ChevronRight, Zap, Trophy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export default function SetUsernamePage() {
  const [username, setUsernameValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUsername } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (username.length < 3) {
      toast.error("Le pseudo doit avoir au moins 3 caractères");
      haptic("error");
      return;
    }

    setIsLoading(true);
    try {
      await setUsername(username);
      haptic("success");
      toast.success("Pseudo enregistré !");
      navigate("/league");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        "Ce pseudo est déjà pris";
      haptic("error");
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

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-400/50 mb-4 shadow-xl"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          >
            <Trophy className="w-10 h-10 text-white" strokeWidth={1.5} />
          </motion.div>
          <h1 className="font-heading text-3xl uppercase tracking-wider text-white">
            Dernière étape !
          </h1>
          <p className="font-body text-gray-400 mt-2 flex items-center justify-center gap-2">
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Zap className="w-4 h-4 text-yellow-500" />
            </motion.span>
            Choisis ton pseudo de pilote
            <motion.span
              animate={{ rotate: [0, -15, 15, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <Zap className="w-4 h-4 text-yellow-500" />
            </motion.span>
          </p>
        </motion.div>

        {/* Card - Arcade Style */}
        <motion.div
          className="card-arcade p-1 glass-card"
          variants={{
            hidden: { opacity: 0, y: 30, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          transition={{ type: "spring", stiffness: 200 }}
        >
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
                <Label htmlFor="username" className="font-body text-gray-300 text-sm">
                  Pseudo
                </Label>
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

              <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
                <Button
                  type="submit"
                  disabled={isLoading || username.length < 3}
                  className="w-full h-14 btn-racing font-heading uppercase tracking-wider text-base relative overflow-hidden group"
                  data-testid="username-submit"
                >
                  <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  {isLoading ? "Enregistrement..." : "C'est parti !"}
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            </CardContent>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
