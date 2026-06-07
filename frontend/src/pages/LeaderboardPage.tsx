import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronLeft,
  MessageCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { fadeUp, slideInLeft, staggerContainer } from "@/lib/motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UserIdentity } from "@/components/users/UserIdentity";

// ----------------------------------------------------------- types ---

interface League {
  id: string;
  name: string;
  code: string;
  members: string[];
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  last_race_points: number;
  position: number;
  position_change: number;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
}

// ----------------------------------------------------------- component ---

export default function LeaderboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLeagueMenu, setShowLeagueMenu] = useState(false);

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my(),
  });

  const activeLeagueId = selectedLeagueId || user?.current_league_id;
  const currentLeague = useMemo(
    () => leagues.find((l: League) => l.id === activeLeagueId) || null,
    [leagues, activeLeagueId],
  );

  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ["/leagues", activeLeagueId, "leaderboard"],
    queryFn: () => api.leagues.leaderboard(activeLeagueId!),
    enabled: !!activeLeagueId,
  });

  const loading = leaguesLoading || (!!activeLeagueId && lbLoading);

  const switchLeague = async (leagueId: string) => {
    try {
      await api.leagues.select(leagueId);
      setSelectedLeagueId(leagueId);
      setShowLeagueMenu(false);
      const league = leagues.find((l: League) => l.id === leagueId);
      toast.success(t("leaderboard.league_selected", { name: league?.name }));
    } catch {
      toast.error(t("leaderboard.league_error"));
    }
  };

  const copyCode = async () => {
    if (!currentLeague) return;
    try {
      await navigator.clipboard.writeText(currentLeague.code);
      setCopied(true);
      toast.success(t("leaderboard.code_copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("leaderboard.copy_error"));
    }
  };

  const shareLeague = async () => {
    if (!currentLeague) return;
    const text = `Rejoins ma ligue F1 "${currentLeague.name}" sur PronoKif ! Code : ${currentLeague.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "PronoKif", text });
      } catch (e: unknown) {
        if ((e as DOMException).name !== "AbortError") copyCode();
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // ---- Podium data (top 3) ----
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-dvh bg-pk-carbon p-4 pt-16 max-w-[430px] mx-auto">
        <div className="space-y-3">
          <div className="h-8 w-48 rounded-md bg-pk-surface border border-white/[0.06] animate-pulse" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-md bg-pk-surface border border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-pk-carbon pb-24 max-w-[430px] mx-auto"
      data-testid="leaderboard-page"
      aria-labelledby="leaderboard-title"
    >
      {/* ---- HEADER ---- */}
      <header
        className="sticky top-0 z-50
          flex items-center gap-3
          px-4 py-3
          bg-pk-carbon/92 backdrop-blur-[20px] saturate-[1.3]
          border-b border-white/[0.08]"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full
            flex items-center justify-center
            bg-white/[0.04] border border-white/[0.08]
            text-pk-piste hover:border-white/[0.15]
            transition-colors duration-pk-short"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 id="leaderboard-title" className="font-display text-[1rem] uppercase">
            {currentLeague?.name || t("leaderboard.title")}
          </h1>
          <p className="font-mono text-[0.5625rem] text-pk-titane uppercase tracking-[0.1em]">
            {t("leaderboard.league_title")}
          </p>
        </div>
        <button
          onClick={shareLeague}
          className="w-8 h-8 rounded-full flex items-center justify-center
            text-pk-titane hover:text-pk-piste
            transition-colors duration-pk-short"
          aria-label={t("leaderboard.aria_share")}
        >
          <Share2 size={18} strokeWidth={1.5} />
        </button>
      </header>

      {/* ---- LEAGUE HERO ---- */}
      {currentLeague && (
        <div
          className="px-4 py-5 border-b border-white/[0.08]"
          style={{
            background: "linear-gradient(135deg, rgba(225,6,0,0.03) 0%, transparent 60%)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[2.5rem]">{"\u{1F3C6}"}</span>
            <div className="flex-1">
              <h2 className="font-display text-[1.25rem] uppercase">{currentLeague.name}</h2>
              <p className="text-[0.75rem] text-pk-titane mt-0.5">
                {currentLeague.members.length} membres • Code :{" "}
                <span className="font-mono text-pk-amber">{currentLeague.code}</span>
              </p>
            </div>
          </div>
          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/league/${currentLeague.id}/chat`)}
              className="btn-pk-outline text-[0.6875rem] px-3"
              aria-label={t("leaderboard.aria_chat")}
            >
              <MessageCircle size={13} strokeWidth={1.5} />
              {t("leaderboard.chat")}
            </button>
            <button
              onClick={copyCode}
              className="btn-pk-outline text-[0.6875rem] px-3"
              aria-label={copied ? t("leaderboard.code_copied") : t("leaderboard.aria_copy")}
            >
              {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
              {copied ? t("leaderboard.copy") : t("leaderboard.code")}
            </button>
            <button
              onClick={() => navigate("/league")}
              className="btn-pk-outline text-[0.6875rem] px-3"
              aria-label={t("leaderboard.aria_join")}
            >
              <Plus size={13} strokeWidth={2} />
              {t("leaderboard.league")}
            </button>
            {leagues.length > 1 && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowLeagueMenu(!showLeagueMenu)}
                  className="btn-pk-outline text-[0.6875rem] px-3"
                  data-testid="league-selector"
                >
                  {t("leaderboard.change")}
                  <ChevronDown size={12} strokeWidth={2} />
                </button>
                {showLeagueMenu && (
                  <div
                    className="absolute top-full right-0 mt-1 w-48 z-20
                      bg-pk-anthracite border border-white/[0.08] rounded-md
                      shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
                  >
                    {leagues.map((league: League) => (
                      <button
                        key={league.id}
                        onClick={() => switchLeague(league.id)}
                        className={`w-full text-left px-3 py-2.5 text-[0.8125rem]
                          hover:bg-white/[0.04] transition-colors duration-pk-short
                          ${league.id === currentLeague?.id ? "text-pk-red" : "text-pk-piste"}`}
                      >
                        {league.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- PODIUM ---- */}
      {podium.length >= 3 && (
        <>
          <div className="flex items-end justify-center gap-2 px-4 pt-6 pb-4">
            {/* P2 — Silver */}
            <PodiumSlot entry={podium[1]} medal={"\u{1F948}"} tier="silver" navigate={navigate} />
            {/* P1 — Gold */}
            <PodiumSlot entry={podium[0]} medal={"\u{1F947}"} tier="gold" navigate={navigate} />
            {/* P3 — Bronze */}
            <PodiumSlot entry={podium[2]} medal={"\u{1F949}"} tier="bronze" navigate={navigate} />
          </div>
          {/* Gradient bar */}
          <div
            className="h-[3px] mx-4 rounded-full opacity-30"
            style={{
              background:
                "linear-gradient(90deg, var(--pk-gold), var(--pk-silver), var(--pk-bronze))",
            }}
          />
        </>
      )}

      {/* ---- RANKING TABLE ---- */}
      <motion.div className="pt-2" variants={staggerContainer} initial="hidden" animate="visible">
        {rest.map((entry: LeaderboardEntry, i: number) => {
          const isMe = entry.user_id === user?.id;
          return (
            <motion.div
              key={entry.user_id}
              variants={slideInLeft}
              onClick={() => navigate(`/profile/${entry.user_id}`)}
              className={`
                flex items-center gap-2 px-4 py-2.5
                border-b border-white/[0.03]
                cursor-pointer hover:bg-white/[0.02]
                transition-colors duration-pk-short
                ${isMe ? "bg-pk-red-subtle border-l-[3px] border-l-pk-red" : ""}
              `}
              role="row"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/profile/${entry.user_id}`);
              }}
              aria-label={`${entry.position}${t("common.rank_suffix")} - ${entry.username}${isMe ? ` ${t("common.you")}` : ""}`}
              data-testid={`leaderboard-row-${i + 3}`}
            >
              {/* Position */}
              <span className="font-mono text-[0.875rem] font-bold text-pk-titane w-7 text-center flex-shrink-0">
                {entry.position}
              </span>
              <UserIdentity
                user={{
                  ...entry,
                  username: isMe ? `${entry.username} ${t("common.you")}` : entry.username,
                }}
                size="sm"
                linked={false}
                className="flex-1"
                textClassName="text-[0.8125rem] font-medium"
                data-testid={`leaderboard-row-user-${entry.user_id}`}
              >
                {entry.last_race_points > 0 && (
                  <span className="mt-0.5 block font-mono text-[0.5625rem] text-pk-emerald">
                    +{entry.last_race_points} {t("leaderboard.last_gp")}
                  </span>
                )}
              </UserIdentity>
              {/* Points */}
              <span className="font-mono text-[0.9375rem] font-bold w-[52px] text-right flex-shrink-0">
                {entry.total_points}
              </span>
              {/* Trend */}
              <TrendBadge change={entry.position_change} />
            </motion.div>
          );
        })}

        {/* Also show podium entries in the list for "me" row if in top 3 */}
        {leaderboard.length === 0 && (
          <div className="p-8 text-center">
            <Users size={32} strokeWidth={1.5} className="text-pk-titane mx-auto mb-3" />
            <h3 className="font-display text-[1rem] uppercase mb-1 text-pk-titane">
              {t("leaderboard.no_ranking")}
            </h3>
            <p className="text-[0.8125rem] text-pk-titane mb-4">
              {t("leaderboard.invite_friends")}
            </p>
            {currentLeague && (
              <button onClick={shareLeague} className="btn-pk text-[0.8125rem]">
                <Share2 size={14} strokeWidth={2} />
                {t("leaderboard.invite_cta")}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* No league fallback */}
      {leagues.length === 0 && (
        <div className="mx-4 mt-6 bg-pk-surface border border-white/[0.08] rounded-md p-6 text-center">
          <Trophy size={32} strokeWidth={1.5} className="text-pk-titane mx-auto mb-3" />
          <h3 className="font-display text-[1.125rem] uppercase mb-1">
            {t("leaderboard.no_league")}
          </h3>
          <p className="text-[0.8125rem] text-pk-titane mb-4">{t("leaderboard.join_cta")}</p>
          <button onClick={() => navigate("/league")} className="btn-pk">
            <Plus size={14} strokeWidth={2} />
            {t("leaderboard.create_join")}
          </button>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------- sub-components ---

function PodiumSlot({
  entry,
  medal,
  tier,
  navigate,
}: {
  entry: LeaderboardEntry;
  medal: string;
  tier: "gold" | "silver" | "bronze";
  navigate: (path: string) => void;
}) {
  const colors = {
    gold: {
      bg: "from-[rgba(255,215,0,0.08)] to-[rgba(255,215,0,0.02)]",
      border: "rgba(255,215,0,0.15)",
      avatar: "border-pk-gold",
      pts: "text-pk-gold",
      size: "w-[110px] min-h-[140px]",
      avatarSize: "w-12 h-12 text-[0.875rem]",
    },
    silver: {
      bg: "from-[rgba(192,192,192,0.06)] to-[rgba(192,192,192,0.01)]",
      border: "rgba(192,192,192,0.1)",
      avatar: "border-pk-silver",
      pts: "text-pk-silver",
      size: "w-24 min-h-[110px]",
      avatarSize: "w-10 h-10 text-[0.75rem]",
    },
    bronze: {
      bg: "from-[rgba(205,127,50,0.06)] to-[rgba(205,127,50,0.01)]",
      border: "rgba(205,127,50,0.1)",
      avatar: "border-pk-bronze",
      pts: "text-pk-bronze",
      size: "w-24 min-h-[90px]",
      avatarSize: "w-10 h-10 text-[0.75rem]",
    },
  };

  const c = colors[tier];

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      onClick={() => navigate(`/profile/${entry.user_id}`)}
      className={`${c.size} flex flex-col items-center
        rounded-t-md py-3 px-2 cursor-pointer
        bg-gradient-to-b ${c.bg}`}
      style={{ borderWidth: 1, borderStyle: "solid", borderColor: c.border, borderBottomWidth: 0 }}
      role="button"
      tabIndex={0}
    >
      <span className="text-[1.125rem] mb-0.5">{medal}</span>
      <UserIdentity
        user={entry}
        layout="vertical"
        size={tier === "gold" ? "md" : "sm"}
        linked={false}
        className="mb-1 max-w-full"
        textClassName="font-medium text-[0.6875rem] leading-tight max-w-[86px]"
        data-testid={`leaderboard-podium-user-${entry.user_id}`}
      />
      <p className={`font-mono text-[0.75rem] font-bold mt-0.5 ${c.pts}`}>{entry.total_points}</p>
      <p className="font-mono text-[0.4375rem] text-pk-titane uppercase">pts</p>
    </motion.div>
  );
}

function TrendBadge({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[rgba(16,185,129,0.1)] text-pk-emerald">
        <TrendingUp size={12} strokeWidth={2} />
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-[rgba(225,6,0,0.1)] text-pk-red">
        <TrendingDown size={12} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-white/[0.03] text-pk-titane">
      <Minus size={12} strokeWidth={2} />
    </span>
  );
}
