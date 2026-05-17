import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, ChevronRight } from "lucide-react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import type { AvatarObject, AvatarsData } from "../../components/AvatarDisplay";
import NotificationBell from "../../components/NotificationBell";
import FeedbackModal from "../../components/FeedbackModal";
import HamburgerMenu from "../../components/hamburger-menu/HamburgerMenu";
import StreakWidget from "../../components/StreakWidget";
import PullToRefreshIndicator from "../../components/PullToRefreshIndicator";
import NewResultsBanner from "../../components/NewResultsBanner";
import { GlowCard } from "../../components/PageTransition";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import RaceSlider from "./RaceSlider";
import { LeaguesList, NoLeagueCTA, HelpAdminCard } from "./LeaguesList";
import { useDashboardData } from "./useDashboardData";
import { useAuth } from "@/lib/auth";
import type { Race } from "@/types/api";

// Lazy 3D hero (heavy — only loads on dashboard)
const HeroScene = lazy(() => import("../../components/three/HeroScene"));

const HERO_BANNER =
  "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/d9b6f1a65194f54bbc34bb7e15e4af8069ab64dab312c6c3be1db79b2ca45259.png";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { loading, upcomingRaces, avatars, userLeagues, unreadChatByLeague, predictions } =
    useDashboardData();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { containerRef, pullDistance, refreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const [currentRaceIndex, setCurrentRaceIndex] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [sprintCountdown, setSprintCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Countdown timer (stays as local state — not server data)
  useEffect(() => {
    const currentRace = upcomingRaces[currentRaceIndex];
    if (!currentRace?.predictions_close_at) return;
    const updateCountdown = () => {
      const mainDiff = new Date(currentRace.predictions_close_at).getTime() - Date.now();
      if (mainDiff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setCountdown({
          days: Math.floor(mainDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((mainDiff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((mainDiff / (1000 * 60)) % 60),
          seconds: Math.floor((mainDiff / 1000) % 60),
        });
      }
      if (currentRace.is_sprint_weekend && (currentRace as Race & { sprint_predictions_close_at?: string }).sprint_predictions_close_at) {
        const sprintDiff = new Date((currentRace as Race & { sprint_predictions_close_at: string }).sprint_predictions_close_at).getTime() - Date.now();
        if (sprintDiff <= 0) {
          setSprintCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          setSprintCountdown({
            days: Math.floor(sprintDiff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((sprintDiff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((sprintDiff / (1000 * 60)) % 60),
            seconds: Math.floor((sprintDiff / 1000) % 60),
          });
        }
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [upcomingRaces, currentRaceIndex]);

  const getAvatarById = (avatarId: string | null | undefined): AvatarObject | null =>
    (avatars as AvatarsData | null)?.all?.find((a) => a.id === avatarId) || null;

  const currentRace = upcomingRaces[currentRaceIndex];
  const currentPrediction = currentRace ? (predictions[currentRace.id] ?? null) as { id: string | number; [key: string]: unknown } | null : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-48 skeleton-arcade rounded-xl" />
          <div className="h-64 skeleton-arcade rounded-xl" />
          <div className="h-40 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-app-main pb-24" data-testid="dashboard-page">
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />

      {/* Compact Profile Banner */}
      <div
        onClick={() => navigate("/profile")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/profile"); }}
        role="button"
        tabIndex={0}
        aria-label="Voir mon profil"
        className="relative z-20 bg-gradient-to-r from-[#0a1628] via-[#0c1a30] to-[#0a1628] cursor-pointer hover:from-[#0c1a30] hover:via-[#0f1f3a] hover:to-[#0c1a30] transition-all border-b border-cyan-500/20"
        data-testid="profile-banner"
      >
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarDisplay
              avatar={getAvatarById(user?.avatar_id)}
              customUrl={user?.custom_avatar_url as string | null}
              size="sm"
            />
            <div>
              <p className="font-heading text-sm text-white uppercase tracking-wide">
                {user?.username}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-body text-[10px] text-white bg-gradient-to-r from-blue-600 to-blue-800 px-1.5 py-0.5 rounded-full shadow">
                  Niv. {(user?.level as number) || 1}
                </span>
                <span className="font-data text-[10px] text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-yellow-500 text-yellow-400" />{" "}
                  {(user?.xp as number) || 0} XP
                </span>
              </div>
              {/* XP progress bar to next level */}
              <div className="mt-1 w-24 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((user?.xp as number) || 0) % 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StreakWidget />
            {userLeagues.length > 0 && (
              <div className="text-right hidden sm:block">
                <p className="font-body text-[9px] text-gray-500 uppercase tracking-wider">Ligue</p>
                <p className="font-heading text-xs text-cyan-400">
                  {userLeagues.find(
                    (l: { id: string | number; name: string }) => l.id === user?.current_league_id,
                  )?.name || userLeagues[0]?.name}
                </p>
              </div>
            )}
            <div className="flex items-center gap-1 bg-cyan-500/20 px-2 py-1 rounded-full">
              <span className="font-body text-xs text-cyan-400 uppercase tracking-wide">
                Profil
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section — 3D Scene + Overlay */}
      <div className="relative w-full h-56 overflow-hidden">
        {/* Top bar controls */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 flex items-center justify-between">
          <HamburgerMenu />
          <NotificationBell />
        </div>

        {/* 3D animated hero background */}
        <Suspense
          fallback={
            <img
              src={HERO_BANNER}
              alt="PRONOKIF"
              className="w-full h-full object-cover object-center"
            />
          }
        >
          <HeroScene className="absolute inset-0" />
        </Suspense>

        {/* Title overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <motion.h1
            className="font-heading text-4xl text-white tracking-wider uppercase text-glow-orange"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            PRONOKIF
          </motion.h1>
          <motion.p
            className="font-body text-[11px] text-cyan-200/90 tracking-[0.12em] font-medium mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Pronostique · Défie tes amis · Domine le classement
          </motion.p>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#050a14] to-transparent z-10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <NewResultsBanner />
        </motion.div>

        <GlowCard color="rgba(255, 102, 0, 0.3)">
          <RaceSlider
            upcomingRaces={upcomingRaces}
            currentRaceIndex={currentRaceIndex}
            setCurrentRaceIndex={setCurrentRaceIndex}
            currentRace={currentRace}
            currentPrediction={currentPrediction}
            countdown={countdown}
            sprintCountdown={sprintCountdown}
          />
        </GlowCard>

        <GlowCard color="rgba(0, 204, 255, 0.2)">
          {userLeagues.length > 0 ? (
            <LeaguesList
              userLeagues={userLeagues}
              user={user}
              unreadChatByLeague={unreadChatByLeague}
            />
          ) : (
            <NoLeagueCTA />
          )}
        </GlowCard>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <HelpAdminCard onClick={() => setShowFeedbackModal(true)} />
        </motion.div>
      </div>

      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
}
