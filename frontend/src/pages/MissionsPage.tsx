import { useState, useCallback, useEffect, lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronLeft,
  Trophy,
  Target,
  Users,
  Check,
  Crown,
  Medal,
  Zap,
  Flag,
  Calendar,
  Eye,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import RewardCelebration from "../components/RewardCelebration";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { EmptyMinimal } from "@/components/EmptyState";

const VictoryExplosion = lazy(() => import("../components/three/VictoryExplosion"));

/* ── Types ─────────────────────────────────────────────── */

interface MissionItem {
  mission_id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  current: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

type TabKey = "active" | "complete" | "season";

const TAB_KEYS: { key: TabKey; labelKey: string }[] = [
  { key: "active", labelKey: "missions.tabs.active" },
  { key: "complete", labelKey: "missions.tabs.completed" },
  { key: "season", labelKey: "missions.tabs.season" },
];

/* ── Rarity colors ─────────────────────────────────────── */

const RARITY_STRIPE: Record<string, string> = {
  common: "bg-pk-info",
  rare: "bg-pk-amber",
  epic: "bg-purple-500",
  legendary: "bg-gradient-to-r from-pk-gold to-pk-amber",
};

const RARITY_BAR: Record<string, string> = {
  common: "bg-pk-info",
  rare: "bg-pk-amber",
  epic: "bg-purple-500",
  legendary: "bg-pk-gold",
};

/* ── Icon mapping ──────────────────────────────────────── */

const ICON_MAP: Record<string, LucideIcon> = {
  target: Target,
  trophy: Trophy,
  crown: Crown,
  calendar: Calendar,
  flag: Flag,
  zap: Zap,
  medal: Medal,
  check: Check,
  eye: Eye,
  "alert-triangle": AlertTriangle,
  "x-circle": AlertTriangle,
  "corner-down-right": Flag,
  "plus-circle": Zap,
  edit: Target,
  users: Users,
};

/* ── Helpers ───────────────────────────────────────────── */

function MissionIcon({ icon }: { icon: string }) {
  const LucideIcon = ICON_MAP[icon.toLowerCase()];
  if (LucideIcon) return <LucideIcon className="w-6 h-6 text-pk-piste" />;
  return <span>{icon}</span>;
}

function inferRarity(mission: MissionItem): string {
  if (mission.rarity) return mission.rarity;
  if (mission.xp_reward >= 500) return "legendary";
  if (mission.xp_reward >= 200) return "epic";
  if (mission.xp_reward >= 75) return "rare";
  return "common";
}

/* ── Shimmer Loading ───────────────────────────────────── */

function MissionsSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 p-4 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 rounded bg-pk-anthracite animate-shimmer" />
          <div className="h-5 w-16 rounded bg-pk-anthracite animate-shimmer" />
        </div>
        <div className="flex">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 h-8 bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="px-4 pt-3 space-y-2 pb-24">
        <div className="flex items-center gap-2.5 p-3.5 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer">
          <div className="w-9 h-9 rounded-full bg-pk-anthracite" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-20 rounded bg-pk-anthracite" />
            <div className="h-1 w-full rounded bg-pk-anthracite" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function MissionsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuth();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  useEffect(() => {
    const preloadExplosion = () => {
      void import("../components/three/VictoryExplosion");
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(preloadExplosion);
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const id = window.setTimeout(preloadExplosion, 0);
    return () => window.clearTimeout(id);
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    show: boolean;
    xp: number;
    levelUp: { from: number; to: number } | null;
  }>({ show: false, xp: 0, levelUp: null });

  const dismissCelebration = useCallback(() => setCelebration((c) => ({ ...c, show: false })), []);

  /* ── Queries ── */

  const { data: missionsData, isLoading: missionsLoading } = useQuery({
    queryKey: ["/user/missions"],
    queryFn: () => api.missions.list(),
  });

  const { data: stats = null, isLoading: statsLoading } = useQuery({
    queryKey: ["/user/stats"],
    queryFn: () => api.user.stats(),
  });

  const loading = missionsLoading || statsLoading;
  const missions = (missionsData?.missions || []) as unknown as MissionItem[];
  const categories = (missionsData?.categories || {}) as unknown as Record<string, MissionItem[]>;

  /* ── Derived data ── */

  const allMissions = useMemo(
    () => Object.values(categories).flat() as MissionItem[],
    [categories],
  );

  const activeMissions = useMemo(() => allMissions.filter((m) => !m.claimed), [allMissions]);
  const completedMissions = useMemo(() => allMissions.filter((m) => m.claimed), [allMissions]);
  const claimableCount = useMemo(
    () => allMissions.filter((m) => m.completed && !m.claimed).length,
    [allMissions],
  );

  const displayedMissions = useMemo(() => {
    switch (activeTab) {
      case "active":
        return activeMissions;
      case "complete":
        return completedMissions;
      case "season":
        return allMissions.filter(
          (m) => inferRarity(m) === "epic" || inferRarity(m) === "legendary",
        );
    }
  }, [activeTab, activeMissions, completedMissions, allMissions]);

  /* ── Mutations ── */

  const handleClaimMission = async (missionId: string) => {
    setClaiming(missionId);
    try {
      const res = await api.missions.claim(missionId);
      haptic("success");
      setCelebration({
        show: true,
        xp: res.xp_earned,
        levelUp: res.level_up ? { from: res.new_level - 1, to: res.new_level } : null,
      });
      if (updateUser) {
        updateUser({ xp: res.new_xp, level: res.new_level });
      }
      queryClient.invalidateQueries({ queryKey: ["/user/missions"] });
      queryClient.invalidateQueries({ queryKey: ["/user/stats"] });
    } catch (e: unknown) {
      haptic("error");
      toast.error(
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
          t("common.error"),
      );
    } finally {
      setClaiming(null);
    }
  };

  /* ── XP progress ── */

  const xpProgress = useMemo(() => {
    if (!user) return 0;
    const xpForLevel = user.level * 200;
    return Math.min(100, Math.round(((user.xp % xpForLevel) / xpForLevel) * 100));
  }, [user]);

  /* ── Loading ── */

  if (loading) return <MissionsSkeleton />;

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="missions-page">
      {/* 3D Victory Explosion */}
      <Suspense fallback={null}>
        <VictoryExplosion show={celebration.show} onDone={dismissCelebration} />
      </Suspense>

      <RewardCelebration
        show={celebration.show}
        onDone={dismissCelebration}
        xpEarned={celebration.xp}
        message={t("missions.completed_toast")}
        levelUp={celebration.levelUp}
      />

      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="font-display text-lg">Missions</h1>
            </div>
            {/* Streak display — only if the API returns streak data */}
            {stats &&
              "streak_days" in stats &&
              (stats as unknown as { streak_days: number }).streak_days > 0 && (
                <span className="font-data text-[0.5625rem] text-pk-amber flex items-center gap-1">
                  🔥 {(stats as unknown as { streak_days: number }).streak_days} {t("common.days")}
                </span>
              )}
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5">
            {TAB_KEYS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  haptic("selection");
                  setActiveTab(tab.key);
                }}
                className={`flex-1 py-1.5 rounded-full text-center font-data text-[0.5625rem] border transition-colors ${
                  activeTab === tab.key
                    ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                    : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
                }`}
                data-testid={`missions-tab-${tab.key}`}
              >
                {t(tab.labelKey)}
                {tab.key === "active" && claimableCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[14px] h-3.5 rounded-full bg-pk-red text-white text-[0.4375rem] px-1 ml-1">
                    {claimableCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <motion.div
        className="px-4 pt-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Level Strip */}
        {user && (
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2.5 p-3.5 bg-pk-surface border border-white/[0.08] rounded-lg mb-3"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pk-amber to-pk-gold flex items-center justify-center font-data text-base font-bold text-pk-carbon flex-shrink-0">
              {user.level}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[0.8125rem]">
                {t("missions.level", { level: user.level })}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pk-amber transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <span className="font-data text-[0.5rem] text-pk-amber">{xpProgress}%</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mission Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="grid grid-cols-2 gap-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            {...rmProps}
          >
            {displayedMissions.map((mission) => {
              const rarity = inferRarity(mission);
              const progress = Math.min(100, (mission.current / mission.target) * 100);
              const canClaim = mission.completed && !mission.claimed;
              const isClaiming = claiming === mission.mission_id;

              return (
                <motion.div
                  key={mission.mission_id}
                  variants={fadeUp}
                  className={`relative bg-pk-surface border border-white/[0.08] rounded-lg p-3.5 overflow-hidden transition-all ${
                    mission.claimed ? "opacity-50" : ""
                  } ${canClaim ? "border-pk-emerald/30" : ""}`}
                >
                  {/* Rarity stripe */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${RARITY_STRIPE[rarity]}`} />

                  {/* Icon */}
                  <div className="text-2xl mb-2">
                    <MissionIcon icon={mission.icon} />
                  </div>

                  {/* Title + desc */}
                  <p className="font-bold text-[0.8125rem] mb-0.5 leading-tight">{mission.name}</p>
                  <p className="text-[0.625rem] text-pk-titane leading-snug mb-2">
                    {mission.description}
                  </p>

                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        mission.completed ? "bg-pk-emerald" : RARITY_BAR[rarity]
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-data text-[0.5rem] text-pk-titane">
                      {mission.current}/{mission.target}
                    </span>
                    <span className="font-data text-[0.5625rem] font-bold text-pk-amber">
                      +{mission.xp_reward} XP
                    </span>
                  </div>

                  {/* Claim overlay */}
                  {canClaim && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-pk-emerald/[0.08] border border-pk-emerald/20 rounded-lg flex items-center justify-center"
                    >
                      <button
                        onClick={() => handleClaimMission(mission.mission_id)}
                        disabled={isClaiming}
                        className="px-4 py-1.5 rounded-md bg-pk-emerald text-white font-data text-[0.625rem] font-bold active:scale-[0.95] transition-transform disabled:opacity-50"
                        data-testid={`claim-mission-${mission.mission_id}`}
                      >
                        {isClaiming ? "..." : t("missions.claim")}
                      </button>
                    </motion.div>
                  )}

                  {/* Claimed check */}
                  {mission.claimed && (
                    <div className="absolute top-2.5 right-2.5">
                      <Check className="w-3.5 h-3.5 text-pk-emerald" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Empty state */}
        {displayedMissions.length === 0 && (
          <EmptyMinimal
            icon={activeTab === "complete" ? "🏅" : "🎯"}
            message={activeTab === "complete" ? t("missions.no_completed") : t("missions.all_done")}
          />
        )}
      </motion.div>
    </div>
  );
}
