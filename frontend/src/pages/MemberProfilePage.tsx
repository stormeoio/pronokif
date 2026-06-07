/**
 * MemberProfilePage — View another user's profile.
 * Broadcast Premium theme: glass header, pk-* stat cards.
 */
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  Trophy,
  Target,
  Zap,
  Medal,
  Timer,
  BarChart3,
  Calendar,
  Users,
  Flag,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { EmptyFullPage } from "@/components/EmptyState";
import { DriverEntityToken } from "@/components/entities/DriverEntityToken";
import { RaceEntityToken } from "@/components/entities/RaceEntityToken";
import { buildDriverLookup } from "@/components/entities/driverEntityUtils";
import { UserIdentity } from "@/components/users/UserIdentity";

/* ── Types ─────────────────────────────────────────────── */

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
    race_id: string;
    race_name: string;
    race_winner: string;
    quali_pole: string;
    points: number;
    locked: boolean;
  }>;
}

/* ── Skeleton ──────────────────────────────────────────── */

function MemberSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08] px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-pk-anthracite animate-shimmer" />
          <div className="h-5 w-24 rounded bg-pk-anthracite animate-shimmer" />
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3 pb-24">
        <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-5 animate-shimmer">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pk-anthracite" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-pk-anthracite" />
              <div className="h-3 w-20 rounded bg-pk-anthracite" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function MemberProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const {
    data: profile = null,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery<MemberProfile | null>({
    queryKey: ["/users", userId, "profile"],
    queryFn: () => api.profile.get(userId!) as Promise<MemberProfile | null>,
    enabled: !!userId,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers", "member-profile-tokens"],
    queryFn: () => api.drivers.list(),
    staleTime: 30 * 60 * 1000,
  });
  const driversByReference = useMemo(
    () => buildDriverLookup(Array.isArray(drivers) ? drivers : []),
    [drivers],
  );

  const loading = profileLoading;
  const error = profileError ? t("member_profile.load_error") : null;

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const isOwnProfile = user?.id === userId;

  /* ── Loading ─────────────────────────────────────────── */

  if (loading) return <MemberSkeleton />;

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-pk-carbon">
        <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
          <div className="px-4 pt-3 pb-3 flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg">{t("member_profile.title")}</h1>
          </div>
        </header>
        <EmptyFullPage
          Icon={Users}
          title={t("member_profile.not_found")}
          description={error || t("member_profile.not_found_desc")}
        />
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="member-profile-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <UserIdentity
            user={{
              id: userId,
              username: profile.username,
              avatar_id: profile.avatar_id,
              custom_avatar_url: profile.custom_avatar_url,
              level: profile.level,
            }}
            linked={false}
            size="sm"
            className="min-w-0 flex-1"
            textClassName="font-display text-lg"
            data-testid="member-profile-header-user"
          />
          {isOwnProfile && (
            <span className="font-data text-[0.5rem] px-1.5 py-0.5 rounded bg-pk-red/20 text-pk-red">
              {t("member_profile.you")}
            </span>
          )}
        </div>
      </header>

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
              id: userId,
              username: profile.username,
              avatar_id: profile.avatar_id,
              custom_avatar_url: profile.custom_avatar_url,
              level: profile.level,
            }}
            linked={false}
            size="xl"
            showLevel
            className="w-full"
            textClassName="font-display text-xl"
            data-testid="member-profile-card-user"
          >
            <span className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1 font-data text-[0.5625rem] text-pk-amber">
                <Zap className="w-3 h-3" />
                {profile.xp} XP
              </span>
              <span className="font-data text-[0.5625rem] text-pk-titane flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t("member_profile.member_since")} {formatDate(profile.created_at)}
              </span>
            </span>
          </UserIdentity>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-pk-titane" />
            <span className="font-display text-sm">{t("member_profile.tabs.stats")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={Target}
              color="text-pk-red"
              bg="bg-pk-red/[0.12]"
              value={profile.stats.total_predictions}
              label={t("member_profile.tabs.predictions")}
            />
            <StatCard
              icon={Flag}
              color="text-pk-emerald"
              bg="bg-pk-emerald/[0.12]"
              value={profile.stats.races_participated}
              label={t("member_profile.stats.races")}
            />
            <StatCard
              icon={Trophy}
              color="text-pk-amber"
              bg="bg-pk-amber/[0.12]"
              value={profile.stats.correct_winners}
              label={t("member_profile.stats.exact_winners")}
            />
            <StatCard
              icon={Medal}
              color="text-purple-400"
              bg="bg-purple-500/[0.12]"
              value={profile.stats.correct_poles}
              label={t("member_profile.stats.exact_poles")}
            />
          </div>
        </motion.div>

        {/* Mini-games Stats */}
        {(profile.minigames.reaction_best_ms || profile.minigames.batak_best_score) && (
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
            {profile.minigames.reaction_best_ms != null && (
              <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 text-center">
                <div className="w-9 h-9 rounded-lg bg-pk-info/[0.12] flex items-center justify-center mx-auto mb-2">
                  <Timer className="w-4.5 h-4.5 text-pk-info" />
                </div>
                <p className="font-data text-xl font-bold">
                  {profile.minigames.reaction_best_ms} ms
                </p>
                <p className="font-data text-[0.5625rem] text-pk-titane">
                  {t("member_profile.stats.best_reaction")}
                </p>
              </div>
            )}
            {profile.minigames.batak_best_score != null && (
              <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 text-center">
                <div className="w-9 h-9 rounded-lg bg-purple-500/[0.12] flex items-center justify-center mx-auto mb-2">
                  <Target className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <p className="font-data text-xl font-bold">{profile.minigames.batak_best_score}</p>
                <p className="font-data text-[0.5625rem] text-pk-titane">
                  {t("member_profile.stats.best_batak")}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Leagues */}
        {profile.leagues.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-pk-amber/[0.12] flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-pk-amber" />
              </div>
              <span className="font-display text-sm">{t("member_profile.shared_leagues")}</span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {profile.leagues.map((league) => (
                <div
                  key={league.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-data text-sm font-bold ${
                        league.position === 1
                          ? "bg-pk-gold/[0.15] text-pk-gold"
                          : league.position === 2
                            ? "bg-pk-silver/[0.15] text-pk-silver"
                            : league.position === 3
                              ? "bg-pk-bronze/[0.15] text-pk-bronze"
                              : "bg-white/[0.04] text-pk-titane"
                      }`}
                    >
                      {league.position || "-"}
                    </div>
                    <div>
                      <p className="font-display text-sm">{league.name}</p>
                      <p className="font-data text-[0.5625rem] text-pk-titane">
                        {league.members_count} {t("common.members")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-base font-bold">{league.total_points}</p>
                    <p className="font-data text-[0.5rem] text-pk-titane uppercase">
                      {t("member_profile.points")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Predictions */}
        {profile.recent_predictions.length > 0 && (
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-pk-red/[0.12] flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-pk-red" />
              </div>
              <span className="font-display text-sm">{t("member_profile.recent_predictions")}</span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {profile.recent_predictions.map((pred) => (
                <div key={pred.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <RaceEntityToken
                      raceId={pred.race_id}
                      raceName={pred.race_name}
                      href={`/results/${pred.race_id}`}
                      className="max-w-full font-display text-xs tracking-normal"
                    />
                    <p className="font-data text-[0.5625rem] text-pk-titane leading-7">
                      {t("member_profile.winner_label")}{" "}
                      <DriverEntityToken
                        value={pred.race_winner}
                        driversByReference={driversByReference}
                      />{" "}
                      · {t("member_profile.pole_label")}{" "}
                      <DriverEntityToken
                        value={pred.quali_pole}
                        driversByReference={driversByReference}
                      />
                    </p>
                  </div>
                  {pred.locked && (
                    <span className="font-data text-[0.5rem] text-pk-emerald bg-pk-emerald/[0.1] px-2 py-0.5 rounded flex-shrink-0 ml-2">
                      {t("member_profile.validated")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  color,
  bg,
  value,
  label,
}: {
  icon: typeof Target;
  color: string;
  bg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg p-3.5 text-center">
      <div className={`w-8 h-8 rounded-md ${bg} flex items-center justify-center mx-auto mb-1.5`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="font-data text-xl font-bold">{value}</p>
      <p className="font-data text-[0.5625rem] text-pk-titane">{label}</p>
    </div>
  );
}
