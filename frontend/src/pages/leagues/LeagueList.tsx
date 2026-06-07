/**
 * LeagueList — Broadcast Premium league cards.
 * Shows user's leagues with active highlight, actions, and unread badges.
 */
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { Users, Copy, Share2, Check, MessageCircle, ChevronRight, Crown } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { EmptyInline } from "@/components/EmptyState";

/* ── Types ─────────────────────────────────────────────── */

export interface LeagueMember {
  id: string | number;
  [key: string]: unknown;
}

export interface LeagueItem {
  id: string | number;
  name: string;
  code: string;
  members?: LeagueMember[] | string[];
}

export interface LeagueListProps {
  leagues: LeagueItem[];
  loading: boolean;
  userId: string | number;
  currentLeagueId: string | number | null | undefined;
  copied: string | null;
  unreadByLeague: Record<string | number, number>;
  onCopyCode: (code: string) => void;
  onShareLeague: (league: LeagueItem) => void;
  onSelectLeague: (id: string | number) => void;
}

/* ── Skeleton ──────────────────────────────────────────── */

function LeagueListSkeleton() {
  return (
    <div className="space-y-2 mb-5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4 animate-shimmer"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pk-anthracite" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-pk-anthracite" />
              <div className="h-2.5 w-20 rounded bg-pk-anthracite" />
            </div>
            <div className="flex gap-1.5">
              <div className="w-8 h-8 rounded-md bg-pk-anthracite" />
              <div className="w-8 h-8 rounded-md bg-pk-anthracite" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function LeagueList({
  leagues,
  loading,
  currentLeagueId,
  copied,
  unreadByLeague,
  onCopyCode,
  onShareLeague,
  onSelectLeague,
}: LeagueListProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  if (loading) return <LeagueListSkeleton />;

  if (leagues.length === 0) {
    return (
      <div className="mb-5" data-testid="league-list-empty">
        <EmptyInline
          icon="🏆"
          title={t("league_list.no_leagues")}
          description={t("league_list.no_leagues_desc")}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-2 mb-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      data-testid="league-list"
      {...rmProps}
    >
      {leagues.map((league) => {
        const isActive = currentLeagueId === league.id;
        const unreadCount = unreadByLeague[league.id] ?? 0;

        return (
          <motion.div
            key={String(league.id)}
            variants={fadeUp}
            className={`bg-pk-surface border rounded-lg p-4 transition-colors ${
              isActive
                ? "border-pk-red/30 bg-pk-red-subtle"
                : "border-white/[0.08] hover:border-white/[0.14]"
            }`}
            data-testid={`league-card-${league.id}`}
          >
            <div className="flex items-center justify-between">
              {/* Left: icon + info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? "bg-pk-red/[0.15] border border-pk-red/25"
                      : "bg-white/[0.04] border border-white/[0.08]"
                  }`}
                >
                  {isActive ? (
                    <Crown className="w-4.5 h-4.5 text-pk-red" />
                  ) : (
                    <Users className="w-4.5 h-4.5 text-pk-titane" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm truncate">{league.name}</h3>
                    {isActive && (
                      <span className="font-data text-[0.5rem] bg-pk-red/20 text-pk-red px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {t("league_list.active")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 font-data text-[0.5625rem] text-pk-titane">
                      <Users className="w-3 h-3" />
                      {league.members?.length ?? 0}
                    </span>
                    <span className="font-data text-[0.5625rem] text-pk-titane">{league.code}</span>
                  </div>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic("light");
                    onShareLeague(league);
                  }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-pk-emerald hover:bg-pk-emerald/[0.08] transition-colors"
                  title={t("league_list.share")}
                  data-testid={`league-share-${league.id}`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic("light");
                    onCopyCode(league.code);
                  }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
                  data-testid={`league-copy-${league.id}`}
                >
                  {copied === league.code ? (
                    <Check className="w-3.5 h-3.5 text-pk-emerald" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic("light");
                    navigate(`/league/${league.id}/chat`);
                  }}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-pk-info hover:bg-pk-info/[0.08] transition-colors relative"
                  data-testid={`league-chat-${league.id}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-pk-red rounded-full flex items-center justify-center font-data text-[0.5rem] text-white px-0.5">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {isActive ? (
                  <button
                    onClick={() => {
                      haptic("medium");
                      navigate(`/league/${league.id}/details`);
                    }}
                    className="h-8 px-3 rounded-md bg-pk-red text-white font-data text-[0.5625rem] font-bold flex items-center gap-1 active:scale-[0.97] transition-transform"
                    data-testid={`league-details-${league.id}`}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      haptic("medium");
                      onSelectLeague(league.id);
                    }}
                    className="h-8 px-3 rounded-md bg-white/[0.06] border border-white/[0.08] text-pk-piste font-data text-[0.5625rem] font-bold active:scale-[0.97] transition-transform"
                    data-testid={`league-activate-${league.id}`}
                  >
                    {t("league_list.activate")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
