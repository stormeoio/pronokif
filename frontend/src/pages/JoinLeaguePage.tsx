import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Trophy, Users, LogIn, Loader2, AlertCircle, CheckCircle, Home } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface LeaguePreview {
  id: string;
  name: string;
  code: string;
  members_count: number;
  description?: string;
}

interface LeagueBasic {
  id: string;
  name: string;
  code: string;
}

export default function JoinLeaguePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(false);

  const {
    data: league = null,
    isLoading: leagueLoading,
    error: leagueError,
  } = useQuery<LeaguePreview | null>({
    queryKey: ["/leagues/by-code", code],
    queryFn: () => api.leagues.byCode(code!) as Promise<LeaguePreview>,
    enabled: !!code,
  });

  const { data: myLeagues = [], isLoading: myLeaguesLoading } = useQuery<LeagueBasic[]>({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my() as Promise<LeagueBasic[]>,
    enabled: !!user && !!league,
  });

  const loading = leagueLoading || (!!user && !!league && myLeaguesLoading);
  const error = leagueError ? "Cette ligue n'existe pas ou le lien est invalide" : null;
  const alreadyMember = myLeagues.some((l: LeagueBasic) => l.code === code?.toUpperCase());

  const handleJoin = async () => {
    if (!user) {
      localStorage.setItem("pendingJoinCode", code || "");
      navigate("/auth");
      return;
    }

    setJoining(true);
    try {
      const res = await api.leagues.join({ code: code!.toUpperCase() });
      updateUser({ ...user, current_league_id: res.id });
      toast.success(`Tu as rejoint "${res.name}" !`);
      navigate("/");
    } catch (e: unknown) {
      const axiosError = e as AxiosError<{ detail: string }>;
      const message = axiosError.response?.data?.detail || "Erreur lors de la connexion";
      if (message.includes("already")) {
        queryClient.invalidateQueries({ queryKey: ["/leagues/my"] });
      } else {
        toast.error(message);
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring" }}
        >
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-400">Chargement de l'invitation...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring" }}
        >
          <motion.div
            className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <AlertCircle className="w-10 h-10 text-red-500" />
          </motion.div>
          <h1 className="font-heading text-2xl text-white mb-2">Lien invalide</h1>
          <p className="font-body text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring" }}
        >
          <motion.div
            className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <CheckCircle className="w-10 h-10 text-green-500" />
          </motion.div>
          <h1 className="font-heading text-2xl text-white mb-2">Déjà membre !</h1>
          <p className="font-body text-gray-400 mb-6">
            Tu fais déjà partie de la ligue{" "}
            <span className="text-yellow-400 font-semibold">{league?.name}</span>
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Aller au dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main flex items-center justify-center p-4">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px]" />

      <motion.div
        className="relative z-10 w-full max-w-md text-center"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
      >
        {/* Header */}
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 border-2 border-yellow-400/50 mb-6 shadow-xl"
          variants={{
            hidden: { opacity: 0, scale: 0, rotate: -20 },
            visible: { opacity: 1, scale: 1, rotate: 0 },
          }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Trophy className="w-10 h-10 text-white" strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          className="font-heading text-3xl uppercase tracking-wider text-white mb-2"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        >
          Invitation
        </motion.h1>
        <motion.p
          className="font-body text-gray-400 mb-8"
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
        >
          Tu as été invité(e) à rejoindre une ligue
        </motion.p>

        {/* League Card */}
        <motion.div
          className="card-arcade p-6 mb-8 glass-card"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { opacity: 1, y: 0, scale: 1 },
          }}
          whileHover={{ scale: 1.02 }}
        >
          <h2 className="font-heading text-xl text-yellow-400 mb-2">{league?.name}</h2>

          {league?.description && (
            <p className="font-body text-sm text-gray-400 mb-4">{league.description}</p>
          )}

          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span className="font-data">{league?.members_count}</span> membre
              {(league?.members_count ?? 0) > 1 ? "s" : ""}
            </span>
            <span className="font-data text-cyan-400">{league?.code}</span>
          </div>
        </motion.div>

        {/* Join Button */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        >
          <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full h-14 btn-racing font-heading uppercase tracking-wider text-base"
              data-testid="join-league-btn"
            >
              {joining ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </span>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Rejoindre la ligue
                </>
              )}
            </Button>
          </motion.div>

          {!user && (
            <motion.p
              className="font-body text-xs text-gray-500 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Tu devras te connecter ou créer un compte pour rejoindre
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
