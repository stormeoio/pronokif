import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, easing, duration, getReducedMotionProps } from "@/lib/motion";

/* ── Types ─────────────────────────────────────────────── */

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_id?: string;
  total_points: number;
  position: number;
  level: number;
  delta?: number;
}

type FilterKey = "season" | "month" | "gp";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "season", label: "Season" },
  { key: "month", label: "Ce mois" },
  { key: "gp", label: "Dernier GP" },
];

/* ── Podium Colors ─────────────────────────────────────── */

const PODIUM_CONFIG = [
  {
    order: 1,
    label: "P2",
    height: "h-16",
    color: "from-pk-silver/30 to-pk-silver/10",
    border: "border-pk-silver/30",
    avatarSize: "lg" as const,
    textColor: "text-pk-silver",
  },
  {
    order: 0,
    label: "P1",
    height: "h-24",
    color: "from-pk-gold/30 to-pk-gold/10",
    border: "border-pk-gold/40",
    avatarSize: "xl" as const,
    textColor: "text-pk-gold",
  },
  {
    order: 2,
    label: "P3",
    height: "h-12",
    color: "from-pk-bronze/30 to-pk-bronze/10",
    border: "border-pk-bronze/30",
    avatarSize: "lg" as const,
    textColor: "text-pk-bronze",
  },
];

/* ── Shimmer Loading ───────────────────────────────────── */

function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 p-4 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="h-5 w-36 rounded bg-pk-anthracite animate-shimmer mb-2" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-7 flex-1 rounded-full bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="px-4 pt-4 pb-24 space-y-3">
        <div className="h-16 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer" />
        <div className="flex items-end justify-center gap-3 py-8">
          <div className="w-20 h-28 bg-pk-surface rounded-t-lg animate-shimmer" />
          <div
            className="w-24 h-40 bg-pk-surface rounded-t-lg animate-shimmer"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-20 h-24 bg-pk-surface rounded-t-lg animate-shimmer"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 bg-pk-surface border border-white/[0.08] rounded-md animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Delta Badge ───────────────────────────────────────── */

function DeltaBadge({ delta }: { delta?: number }) {
  if (!delta || delta === 0) return <Minus className="w-3 h-3 text-pk-titane" />;
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 font-data text-[0.5rem] text-pk-emerald">
        <TrendingUp className="w-3 h-3" />+{delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 font-data text-[0.5rem] text-pk-red">
      <TrendingDown className="w-3 h-3" />
      {delta}
    </span>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function GlobalLeaderboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("season");

  const { data: lbData, isLoading: lbLoading } = useQuery({
    queryKey: ["/leaderboard/global?limit=100"],
    queryFn: () => api.leaderboard.global(100),
  });

  const { data: avatars, isLoading: avatarsLoading } = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  const loading = lbLoading || avatarsLoading;
  const leaderboard = (lbData?.leaderboard || []) as unknown as LeaderboardEntry[];
  const myPosition: number | null = lbData?.my_position || null;
  const totalPlayers: number = lbData?.total_players || 0;

  const getAvatarById = useCallback(
    (avatarId: string | null | undefined) => {
      if (!avatarId) return null;
      return avatars?.all?.find((a: { id: string }) => a.id === avatarId) || null;
    },
    [avatars],
  );

  if (loading) return <LeaderboardSkeleton />;

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="global-leaderboard-page">
      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="font-display text-lg">Leaderboard</h1>
            </div>
            <span className="font-data text-[0.5rem] text-pk-titane">{totalPlayers} players</span>
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  haptic("selection");
                  setActiveFilter(f.key);
                }}
                className={`flex-1 py-1.5 rounded-full text-center font-data text-[0.5625rem] border transition-colors ${
                  activeFilter === f.key
                    ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                    : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
                }`}
                data-testid={`lb-filter-${f.key}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <motion.div
        className="px-4 pt-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* My Position Banner */}
        {myPosition && user && (
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 p-3.5 bg-pk-surface border border-white/[0.08] rounded-lg mb-4"
          >
            <AvatarDisplay
              avatar={getAvatarById(user.avatar_id)}
              customUrl={user.custom_avatar_url}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{user.username}</p>
              <p className="font-data text-[0.5rem] text-pk-titane">Ta position</p>
            </div>
            <div className="text-right">
              <motion.p
                className="font-data text-2xl font-bold text-pk-red"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
              >
                #{myPosition}
              </motion.p>
              <p className="font-data text-[0.5rem] text-pk-titane">/ {totalPlayers}</p>
            </div>
          </motion.div>
        )}

        {/* Visual Podium */}
        {podium.length >= 3 && (
          <motion.div variants={fadeUp} className="flex items-end justify-center gap-2 py-6 mb-4">
            {PODIUM_CONFIG.map((cfg, displayIndex) => {
              const entry = podium[cfg.order];
              if (!entry) return null;

              return (
                <motion.div
                  key={entry.user_id}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: displayIndex * 0.15 + 0.2,
                    duration: duration.medium / 1000,
                    ease: easing.enter,
                  }}
                >
                  {/* Crown for P1 */}
                  {cfg.order === 0 && (
                    <motion.div
                      animate={prefersReducedMotion ? {} : { rotateZ: [-5, 5, -5] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="mb-1"
                    >
                      <Crown className="w-6 h-6 text-pk-gold" />
                    </motion.div>
                  )}

                  <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size={cfg.avatarSize} />
                  <p className="font-bold text-xs mt-1.5 truncate max-w-[72px]">{entry.username}</p>
                  <p className={`font-data text-[0.5625rem] ${cfg.textColor}`}>
                    {entry.total_points} pts
                  </p>

                  {/* Podium block */}
                  <div
                    className={`w-20 ${cfg.height} mt-2 rounded-t-lg bg-gradient-to-t ${cfg.color} border border-b-0 ${cfg.border} flex items-center justify-center`}
                  >
                    <span className="font-display text-xl opacity-60">{cfg.order + 1}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Ranking List */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
        >
          {rest.length === 0 ? (
            <p className="text-sm text-pk-titane text-center py-8">Not enough players.</p>
          ) : (
            rest.map((entry) => {
              const isMe = entry.user_id === user?.id;

              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.08] last:border-b-0 ${
                    isMe ? "bg-pk-red/[0.04]" : ""
                  }`}
                >
                  {/* Position */}
                  <span className="w-8 font-data text-[0.6875rem] text-pk-titane text-center flex-shrink-0">
                    {entry.position}
                  </span>

                  {/* Avatar */}
                  <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isMe ? "text-pk-red" : "text-pk-piste"
                      }`}
                    >
                      {entry.username}
                      {isMe && <span className="text-pk-titane font-normal ml-1">(toi)</span>}
                    </p>
                    <p className="font-data text-[0.5rem] text-pk-titane">Niv. {entry.level}</p>
                  </div>

                  {/* Delta */}
                  <DeltaBadge delta={entry.delta} />

                  {/* Points */}
                  <span className="font-data text-[0.6875rem] text-pk-amber w-12 text-right flex-shrink-0">
                    {entry.total_points}
                  </span>
                </div>
              );
            })
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
