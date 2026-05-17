import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  Target,
  Zap,
  Medal,
  Gamepad2,
  Timer,
  BarChart3,
  Calendar,
  Crown,
  Users,
  Flag,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { AvatarsResponse } from "@/types/api";

interface MemberProfile {
  avatar_id?: string;
  custom_avatar_url?: string;
  username: string;
  level: number;
  xp: number;
  created_at: string;
  stats: {
    total_predictions: number;
    races_participated: number;
    correct_winners: number;
    correct_poles: number;
  };
  minigames: {
    reaction_best_ms?: number;
    batak_best_score?: number;
  };
  leagues: Array<{
    id: string;
    name: string;
    position: number;
    members_count: number;
    total_points: number;
  }>;
  recent_predictions: Array<{
    id: string;
    race_name: string;
    race_winner: string;
    quali_pole: string;
    points: number;
    locked: boolean;
  }>;
}

export default function MemberProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: profile = null,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<MemberProfile | null>({
    queryKey: ["/users", userId, "profile"],
    queryFn: () => api.profile.get(userId!) as Promise<MemberProfile | null>,
    enabled: !!userId,
  });

  const { data: avatars = {} as AvatarsResponse, isLoading: avatarsLoading } = useQuery<AvatarsResponse>({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  const loading = profileLoading || avatarsLoading;
  const error = profileError ? "Impossible de charger le profil" : null;

  const getAvatarById = (avatarId: string | undefined) => {
    return avatars?.all?.find((a: { id: string }) => a.id === avatarId) || null;
  };

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const isOwnProfile = user?.id === userId;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-12 skeleton-arcade rounded-xl w-32" />
          <div className="h-40 skeleton-arcade rounded-xl" />
          <div className="h-48 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-cyan-400 mb-4"
          >
            <ArrowLeft className="w-5 h-5" /> Retour
          </button>
          <div className="card-arcade p-6 text-center">
            <p className="text-red-400">{error || "Profil non trouvé"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="member-profile-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1628] to-transparent p-4">
        <div className="max-w-2xl mx-auto">
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            data-testid="back-btn"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-body text-sm">Retour</span>
          </motion.button>
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto px-4 space-y-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
      >
        {/* Profile Header Card */}
        <motion.div
          className="card-arcade overflow-hidden glass-card"
          variants={{ hidden: { opacity: 0, y: 25, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1 } }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="p-6 bg-gradient-to-b from-blue-900/20 to-transparent">
            <div className="flex items-center gap-4">
              <motion.div
                className="ring-4 ring-yellow-500/50 rounded-full p-1"
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
              >
                <AvatarDisplay
                  avatar={getAvatarById(profile.avatar_id)}
                  customUrl={profile.custom_avatar_url}
                  size="lg"
                />
              </motion.div>
              <div className="flex-1">
                <h1 className="font-heading text-2xl text-white uppercase tracking-tight">
                  {profile.username}
                  {isOwnProfile && <span className="text-cyan-400 text-sm ml-2">(toi)</span>}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-body text-sm text-white bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-1 rounded-full shadow">
                    Niv. {profile.level}
                  </span>
                  <span className="font-data text-sm text-yellow-500 flex items-center gap-1">
                    <Zap className="w-4 h-4 fill-yellow-500" /> {profile.xp} XP
                  </span>
                </div>
                <p className="font-body text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Membre depuis {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </div>
          <div className="h-2 bg-kerb-stripe" />
        </motion.div>

        {/* Stats Card */}
        <motion.div
          className="card-arcade overflow-hidden glass-card"
          variants={{ hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0 } }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-purple-900/20 to-transparent">
            <h2 className="font-heading text-lg text-white uppercase flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Statistiques
            </h2>
          </div>

          <motion.div
            className="grid grid-cols-2 gap-3 p-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
          >
            <motion.div
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              whileHover={{ scale: 1.05, borderColor: "rgba(34,211,238,0.3)" }}
            >
              <Target className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{profile.stats.total_predictions}</p>
              <p className="font-body text-xs text-gray-400">Pronostics</p>
            </motion.div>
            <motion.div
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              whileHover={{ scale: 1.05, borderColor: "rgba(34,197,94,0.3)" }}
            >
              <Flag className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{profile.stats.races_participated}</p>
              <p className="font-body text-xs text-gray-400">Courses</p>
            </motion.div>
            <motion.div
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              whileHover={{ scale: 1.05, borderColor: "rgba(234,179,8,0.3)" }}
            >
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{profile.stats.correct_winners}</p>
              <p className="font-body text-xs text-gray-400">Vainqueurs exacts</p>
            </motion.div>
            <motion.div
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              whileHover={{ scale: 1.05, borderColor: "rgba(249,115,22,0.3)" }}
            >
              <Medal className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{profile.stats.correct_poles}</p>
              <p className="font-body text-xs text-gray-400">Poles exactes</p>
            </motion.div>
          </motion.div>

          <div className="h-2 bg-kerb-stripe" />
        </motion.div>

        {/* Mini-games Stats */}
        {(profile.minigames.reaction_best_ms || profile.minigames.batak_best_score) && (
          <motion.div
            className="card-arcade overflow-hidden glass-card"
            variants={{ hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-green-900/20 to-transparent">
              <h2 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-green-400" />
                Mini-Jeux
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              {profile.minigames.reaction_best_ms && (
                <motion.div
                  className="bg-gradient-to-br from-cyan-900/30 to-transparent border border-cyan-500/30 rounded-xl p-4 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <Timer className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <p className="font-data text-2xl text-cyan-400">
                    {profile.minigames.reaction_best_ms} ms
                  </p>
                  <p className="font-body text-xs text-gray-400">Meilleur temps réaction</p>
                </motion.div>
              )}
              {profile.minigames.batak_best_score && (
                <motion.div
                  className="bg-gradient-to-br from-purple-900/30 to-transparent border border-purple-500/30 rounded-xl p-4 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <Target className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="font-data text-2xl text-purple-400">
                    {profile.minigames.batak_best_score}
                  </p>
                  <p className="font-body text-xs text-gray-400">Meilleur score Batak</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Leagues */}
        {profile.leagues.length > 0 && (
          <motion.div
            className="card-arcade overflow-hidden glass-card"
            variants={{ hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-yellow-900/20 to-transparent">
              <h2 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                Ligues en commun
              </h2>
            </div>

            <motion.div
              className="p-4 space-y-2"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
            >
              {profile.leagues.map((league) => (
                <motion.div
                  key={league.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-heading text-lg ${
                        league.position === 1
                          ? "position-1"
                          : league.position === 2
                            ? "position-2"
                            : league.position === 3
                              ? "position-3"
                              : "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {league.position || "-"}
                    </div>
                    <div>
                      <p className="font-body text-sm text-white">{league.name}</p>
                      <p className="font-body text-xs text-gray-500">
                        {league.members_count} membres
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-lg text-cyan-400">{league.total_points}</p>
                    <p className="font-body text-[10px] text-gray-500 uppercase">Points</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="h-2 bg-kerb-stripe" />
          </motion.div>
        )}

        {/* Recent Predictions */}
        {profile.recent_predictions.length > 0 && (
          <motion.div
            className="card-arcade overflow-hidden glass-card"
            variants={{ hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-red-900/20 to-transparent">
              <h2 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                <Target className="w-5 h-5 text-red-400" />
                Derniers Pronostics
              </h2>
            </div>

            <motion.div
              className="p-4 space-y-2"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
            >
              {profile.recent_predictions.map((pred) => (
                <motion.div
                  key={pred.id}
                  className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4 }}
                >
                  <div>
                    <p className="font-body text-sm text-white">{pred.race_name}</p>
                    <p className="font-body text-xs text-gray-500">
                      Vainqueur: {pred.race_winner} • Pole: {pred.quali_pole}
                    </p>
                  </div>
                  {pred.locked && (
                    <span className="font-body text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                      Validé
                    </span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
