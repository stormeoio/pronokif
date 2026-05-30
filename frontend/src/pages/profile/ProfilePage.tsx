/**
 * ProfilePage — User profile with stats, badges, history, leagues.
 * Broadcast Premium theme: glass header, pk-* cards, tabbed layout.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  LogOut,
  Trophy,
  Target,
  ChevronRight,
  Zap,
  Shield,
  Medal,
  Pencil,
  Crown,
  Globe,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { AvatarSelector } from "../../components/AvatarDisplay";
import BadgeCollection from "../../components/BadgeCollection";
import PointsHistory from "./PointsHistory";
import { MyLeaguesSection } from "./MyLeaguesSection";
import { useProfileData } from "./useProfileData";
import { apiClient, getApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { UserIdentity } from "@/components/users/UserIdentity";

/* ── Skeleton ──────────────────────────────────────────── */

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08] px-4 pt-3 pb-3">
        <div className="h-5 w-24 rounded bg-pk-anthracite animate-shimmer" />
      </div>
      <div className="px-4 pt-4 space-y-3 pb-24">
        <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-5 animate-shimmer">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pk-anthracite" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-pk-anthracite" />
              <div className="h-3 w-24 rounded bg-pk-anthracite" />
              <div className="h-6 w-20 rounded bg-pk-anthracite" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer" />
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const { loading, leagues, avatars, globalPosition, pointsHistory, stats } = useProfileData(
    user!.id,
    user!.current_league_id ?? null,
  );

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  /* ── Actions ─────────────────────────────────────────── */

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
    } catch {
      haptic("error");
      toast.error("Erreur lors de la mise a jour");
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

  /* ── Loading ─────────────────────────────────────────── */

  if (loading) return <ProfileSkeleton />;

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="profile-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="profile-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg">Mon profil</h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-pk-titane hover:text-pk-red transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <motion.div
        className="max-w-md mx-auto px-4 pt-4 space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Profile Card */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-5"
        >
          <UserIdentity
            user={{
              id: user!.id,
              username: user!.username,
              email: user!.email,
              avatar_id: user!.avatar_id,
              custom_avatar_url: user!.custom_avatar_url,
              level: user!.level,
            }}
            linked={false}
            size="xl"
            avatarObject={getAvatarById(user!.avatar_id)}
            className="w-full"
            textClassName="font-display text-xl"
            data-testid="profile-main-identity"
            avatarAccessory={
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowAvatarModal(true);
                }}
                className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-pk-red rounded-full flex items-center justify-center border-2 border-pk-carbon shadow-glow-red"
                data-testid="edit-avatar-btn"
              >
                <Pencil className="w-3 h-3 text-white" />
              </button>
            }
          >
            <p className="font-data text-[0.5625rem] text-pk-titane truncate">{user!.email}</p>
            <div className="flex items-center gap-2.5 mt-2">
              <span className="font-data text-[0.5625rem] px-2 py-0.5 rounded-full bg-pk-info/[0.12] border border-pk-info/20 text-pk-info">
                Niv. {user!.level || 1}
              </span>
              <span className="flex items-center gap-1 font-data text-[0.5625rem] text-pk-amber">
                <Zap className="w-3 h-3" />
                {user!.xp || 0} XP
              </span>
            </div>
            {globalPosition && (
              <div className="flex items-center gap-1 mt-1">
                <Globe className="w-3 h-3 text-pk-titane" />
                <span className="font-data text-[0.5625rem] text-pk-titane">
                  Rang mondial : <span className="text-pk-red font-bold">#{globalPosition}</span>
                </span>
              </div>
            )}
          </UserIdentity>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
          <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 text-center">
            <div className="w-9 h-9 rounded-lg bg-pk-amber/[0.12] flex items-center justify-center mx-auto mb-2">
              <Trophy className="w-4.5 h-4.5 text-pk-amber" />
            </div>
            <p className="font-data text-2xl font-bold">{stats.totalPoints}</p>
            <p className="font-data text-[0.5625rem] text-pk-titane uppercase">Points totaux</p>
          </div>
          <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 text-center">
            <div className="w-9 h-9 rounded-lg bg-pk-red/[0.12] flex items-center justify-center mx-auto mb-2">
              <Target className="w-4.5 h-4.5 text-pk-red" />
            </div>
            <p className="font-data text-2xl font-bold">{stats.totalPredictions}</p>
            <p className="font-data text-[0.5625rem] text-pk-titane uppercase">Pickstics</p>
          </div>
        </motion.div>

        {/* Badge Collection */}
        <motion.div variants={fadeUp}>
          <BadgeCollection
            totalPredictions={stats.totalPredictions}
            totalPoints={stats.totalPoints}
            level={user!.level || 1}
            streak={0}
          />
        </motion.div>

        {/* Points History */}
        <motion.div variants={fadeUp}>
          <PointsHistory
            pointsHistory={pointsHistory}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
          />
        </motion.div>

        {/* Quick Links */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden divide-y divide-white/[0.06]"
        >
          <QuickLink
            icon={Medal}
            label="Missions"
            sub="Gagne de l'XP"
            color="bg-pk-amber/[0.12]"
            iconColor="text-pk-amber"
            onClick={() => navigate("/missions")}
            testId="nav-missions"
          />
          <QuickLink
            icon={MessageSquare}
            label="Picks Perso"
            sub="Cree tes picks perso"
            color="bg-purple-500/[0.12]"
            iconColor="text-purple-400"
            onClick={() => navigate("/custom-predictions")}
            testId="nav-custom-predictions"
          />
          <QuickLink
            icon={Crown}
            label="Classement global"
            sub="Tous les joueurs"
            color="bg-pk-info/[0.12]"
            iconColor="text-pk-info"
            onClick={() => navigate("/leaderboard/global")}
            testId="nav-global-leaderboard"
          />
        </motion.div>

        {/* My Leagues */}
        <motion.div variants={fadeUp}>
          <MyLeaguesSection leagues={leagues} currentLeagueId={user!.current_league_id ?? null} />
        </motion.div>

        {/* Other Links */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden divide-y divide-white/[0.06]"
        >
          <button
            onClick={() => navigate("/leaderboard")}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            data-testid="nav-leaderboard"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-pk-amber/[0.12] flex items-center justify-center">
                <Trophy className="w-4 h-4 text-pk-amber" />
              </div>
              <span className="font-display text-sm">Classement de ligue</span>
            </div>
            <ChevronRight className="w-4 h-4 text-pk-titane" />
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            data-testid="nav-admin"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-pk-red/[0.12] flex items-center justify-center">
                <Shield className="w-4 h-4 text-pk-red" />
              </div>
              <span className="font-display text-sm">Administration</span>
            </div>
            <ChevronRight className="w-4 h-4 text-pk-titane" />
          </button>
        </motion.div>

        {/* Logout button */}
        <motion.div variants={fadeUp}>
          <button
            onClick={handleLogout}
            className="w-full h-11 rounded-lg bg-pk-red/[0.08] border border-pk-red/20 text-pk-red font-display text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            data-testid="logout-btn-bottom"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </motion.div>

        <p className="text-center font-data text-[0.5rem] text-pk-titane/40 pb-2">PRONOKIF v3.0</p>
      </motion.div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowAvatarModal(false)}
        >
          <motion.div
            className="bg-pk-surface border border-white/[0.08] rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sticky top-0 bg-pk-surface/95 backdrop-blur-lg border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
              <h2 className="font-display text-base">Choisir un Avatar</h2>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
              >
                ✕
              </button>
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
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* ── Quick Link Row ────────────────────────────────────── */

interface QuickLinkProps {
  icon: LucideIcon;
  label: string;
  sub: string;
  color: string;
  iconColor: string;
  onClick: () => void;
  testId: string;
}

function QuickLink({ icon: Icon, label, sub, color, iconColor, onClick, testId }: QuickLinkProps) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      data-testid={testId}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-md ${color} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="text-left">
          <span className="font-display text-sm block">{label}</span>
          <span className="font-data text-[0.5625rem] text-pk-titane">{sub}</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-pk-titane" />
    </button>
  );
}
