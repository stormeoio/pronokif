import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  LogOut,
  Trophy,
  Target,
  ChevronRight,
  Zap,
  Shield,
  Gamepad2,
  Medal,
  Edit,
  Crown,
  Globe,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { AvatarDisplay, AvatarSelector } from "../../components/AvatarDisplay";
import BadgeCollection from "../../components/BadgeCollection";
import StreakWidget from "../../components/StreakWidget";
import PointsHistory from "./PointsHistory";
import { MyLeaguesSection } from "./MyLeaguesSection";
import { useProfileData } from "./useProfileData";
import { apiClient, getApiError , api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  // ── Data fetching (TanStack Query) ──────────────────────────────────
  const { loading, leagues, avatars, globalPosition, pointsHistory, stats } = useProfileData(
    user!.id,
    user!.current_league_id ?? null,
  );

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleLogout = () => {
    haptic("heavy");
    logout();
    navigate("/auth");
  };

  const handleAvatarSelect = async (avatarId: string) => {
    try {
      await api.avatars.select(avatarId);
      if (updateUser) updateUser({ avatar_id: avatarId, custom_avatar_url: null });
      haptic("success");
      toast.success("Avatar mis à jour !");
      setShowAvatarModal(false);
    } catch (e: unknown) {
      haptic("error");
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/user/avatar/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (updateUser)
        updateUser({
          avatar_id: undefined,
          custom_avatar_url: (res.data as { avatar_url: string }).avatar_url,
        });
      toast.success("Photo uploadée !");
      setShowAvatarModal(false);
    } catch (e: unknown) {
      toast.error(getApiError(e, "Erreur lors de l'upload"));
    }
  };

  const getAvatarById = (avatarId: string | null | undefined) =>
    avatars?.all?.find((a) => a.id === avatarId) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton-arcade rounded-lg" />
          <div className="h-32 skeleton-arcade rounded-lg" />
          <div className="h-48 skeleton-arcade rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main p-4 pt-6 pb-24" data-testid="profile-page">
      <motion.div
        className="max-w-2xl mx-auto space-y-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
      >
        {/* Profile Header */}
        <motion.div
          className="card-arcade p-5 glass-card"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.97 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } },
          }}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <AvatarDisplay
                avatar={getAvatarById(user!.avatar_id)}
                customUrl={user!.custom_avatar_url}
                size="xl"
              />
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400 shadow-lg hover:bg-blue-500 transition-colors glow-blue"
                data-testid="edit-avatar-btn"
              >
                <Edit className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl uppercase tracking-tight text-white">
                {user!.username}
              </h1>
              <p className="font-body text-sm text-gray-400">{user!.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="bg-blue-500/20 border border-blue-500/50 px-3 py-1 rounded-lg">
                  <span className="font-heading text-sm text-blue-400">
                    Niv. {user!.level || 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-data text-sm text-yellow-400">{user!.xp || 0} XP</span>
                </div>
              </div>
              {globalPosition && (
                <div className="flex items-center gap-1 mt-1">
                  <Globe className="w-3 h-3 text-gray-500" />
                  <span className="font-body text-xs text-gray-400">
                    Rang mondial:{" "}
                    <span className="text-cyan-400 font-semibold">#{globalPosition}</span>
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
          }}
        >
          <motion.div
            className="card-gold p-4 text-center hover-3d"
            variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
          >
            <Trophy className="w-8 h-8 text-yellow-700 mx-auto mb-2" />
            <p className="font-data text-2xl text-yellow-800">{stats.totalPoints}</p>
            <p className="font-body text-xs text-yellow-700 uppercase">Points totaux</p>
          </motion.div>
          <motion.div
            className="card-racing p-4 text-center hover-3d"
            variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
          >
            <Target className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="font-data text-2xl text-white">{stats.totalPredictions}</p>
            <p className="font-body text-xs text-white/80 uppercase">Pronostics</p>
          </motion.div>
        </motion.div>

        {/* Badge Collection */}
        <BadgeCollection
          totalPredictions={stats.totalPredictions}
          totalPoints={stats.totalPoints}
          level={user!.level || 1}
          streak={0}
        />

        <PointsHistory
          pointsHistory={pointsHistory}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
        />

        {/* Quick Links */}
        <div className="card-arcade overflow-hidden">
          <div className="divide-y divide-gray-700/50">
            <QuickLink
              icon={Medal}
              label="Missions"
              sub="Gagne de l'XP"
              color="from-yellow-500 to-yellow-700"
              onClick={() => navigate("/missions")}
              testId="nav-missions"
            />
            <QuickLink
              icon={Gamepad2}
              label="Mini-Jeux"
              sub="Reaction & Batak"
              color="from-purple-500 to-purple-700"
              onClick={() => navigate("/minigames")}
              testId="nav-minigames"
            />
            <QuickLink
              icon={MessageSquare}
              label="Pronos Perso"
              sub="Crée des pronos fun"
              color="from-pink-500 to-pink-700"
              onClick={() => navigate("/custom-predictions")}
              testId="nav-custom-predictions"
            />
            <QuickLink
              icon={Crown}
              label="Classement Global"
              sub="Tous les joueurs"
              color="from-cyan-500 to-cyan-700"
              onClick={() => navigate("/leaderboard/global")}
              testId="nav-global-leaderboard"
            />
          </div>
        </div>

        {/* My Leagues */}
        <MyLeaguesSection leagues={leagues} currentLeagueId={user!.current_league_id ?? null} />

        {/* Other Links */}
        <div className="card-arcade overflow-hidden divide-y divide-gray-700/50">
          <button
            onClick={() => navigate("/leaderboard")}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            data-testid="nav-leaderboard"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-body text-gray-300 font-semibold">Classement Ligue</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            data-testid="nav-admin"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-500" />
              <span className="font-body text-gray-300 font-semibold">Administration</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <Button
          onClick={handleLogout}
          className="w-full h-12 bg-red-500/10 border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 font-heading uppercase tracking-wider rounded-xl"
          data-testid="logout-btn-bottom"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
        <p className="text-center text-gray-500 text-xs font-body">
          PRONOKIF v3.0 • Made with passion for F1
        </p>
      </motion.div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setShowAvatarModal(false)}
        >
          <div
            className="card-arcade w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-transparent p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg uppercase text-white">Choisir un Avatar</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAvatarModal(false)}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-4">
              <AvatarSelector
                avatars={avatars ?? undefined}
                selectedId={user!.avatar_id ?? undefined}
                onSelect={handleAvatarSelect}
                customUrl={user!.custom_avatar_url}
                onUpload={handleAvatarUpload}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickLinkProps {
  icon: LucideIcon;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
  testId: string;
}

function QuickLink({ icon: Icon, label, sub, color, onClick, testId }: QuickLinkProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <span className="font-body text-white font-semibold block">{label}</span>
          <span className="font-body text-xs text-gray-400">{sub}</span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-500" />
    </button>
  );
}
