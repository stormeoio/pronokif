import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  ChevronRight,
  Trophy,
  Target,
  Flame,
  TrendingUp,
  TrendingDown,
  Plus,
  Users,
  Radio,
  Zap,
} from "lucide-react";
import RaceHeroCard from "./RaceHeroCard";
import { useDashboardData } from "./useDashboardData";
import { iconSmall } from "@/lib/icons";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useAuth } from "@/lib/auth";
import { openDeepSearch } from "@/components/search/deepSearchEvents";
import { UserIdentity } from "@/components/users/UserIdentity";

const RACE_FLAGS: Record<string, string> = {
  australia: "\u{1F1E6}\u{1F1FA}",
  china: "\u{1F1E8}\u{1F1F3}",
  japan: "\u{1F1EF}\u{1F1F5}",
  miami: "\u{1F1FA}\u{1F1F8}",
  canada: "\u{1F1E8}\u{1F1E6}",
  monaco: "\u{1F1F2}\u{1F1E8}",
  spain: "\u{1F1EA}\u{1F1F8}",
  austria: "\u{1F1E6}\u{1F1F9}",
  silverstone: "\u{1F1EC}\u{1F1E7}",
  belgium: "\u{1F1E7}\u{1F1EA}",
  hungary: "\u{1F1ED}\u{1F1FA}",
  netherlands: "\u{1F1F3}\u{1F1F1}",
  monza: "\u{1F1EE}\u{1F1F9}",
  madrid: "\u{1F1EA}\u{1F1F8}",
  azerbaijan: "\u{1F1E6}\u{1F1FF}",
  singapore: "\u{1F1F8}\u{1F1EC}",
  austin: "\u{1F1FA}\u{1F1F8}",
  mexico: "\u{1F1F2}\u{1F1FD}",
  brazil: "\u{1F1E7}\u{1F1F7}",
  vegas: "\u{1F1FA}\u{1F1F8}",
  qatar: "\u{1F1F6}\u{1F1E6}",
  abudhabi: "\u{1F1E6}\u{1F1EA}",
};

function formatRaceDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function raceFlag(raceId: string) {
  const key = raceId.replace("-2026", "");
  return RACE_FLAGS[key] ?? "\u{1F3C1}";
}

function tierLabel(rank: number, totalPlayers: number) {
  if (!rank || !totalPlayers) return "Classement";
  const ratio = rank / totalPlayers;
  if (ratio <= 0.05) return "Diamant";
  if (ratio <= 0.15) return "Platine";
  if (ratio <= 0.35) return "Or";
  if (ratio <= 0.65) return "Argent";
  return "Bronze";
}

// ----------------------------------------------------------- component ---

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    loading,
    upcomingRaces,
    userLeagues,
    predictions,
    leagueRanks,
    predictionStats,
    pointsHistory,
    globalLeaderboard,
  } = useDashboardData(user?.id);

  const [currentRaceIndex] = useState(0);
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    phase: "upcoming" as "upcoming" | "in_progress" | "finished" | "cancelled",
  });

  // Race state timer: upcoming -> in progress -> finished using circuit-local API timestamps.
  useEffect(() => {
    const currentRace = upcomingRaces[currentRaceIndex];
    if (!currentRace) return;

    const update = () => {
      if (currentRace.status === "cancelled" || currentRace.is_cancelled) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, phase: "cancelled" });
        return;
      }

      const startAt = new Date(currentRace.race_start_at ?? currentRace.date).getTime();
      const durationMs = (currentRace.race_duration_minutes ?? 120) * 60_000;
      const endAt = currentRace.race_end_at
        ? new Date(currentRace.race_end_at).getTime()
        : startAt + durationMs;
      if (Number.isNaN(startAt) || Number.isNaN(endAt)) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          phase: currentRace.status ?? "upcoming",
        });
        return;
      }

      const now = Date.now();
      if (now >= endAt) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, phase: "finished" });
        return;
      }
      if (now >= startAt) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, phase: "in_progress" });
        return;
      }

      const diff = startAt - now;
      setCountdown({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff / 3_600_000) % 24),
        minutes: Math.floor((diff / 60_000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        phase: "upcoming",
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [upcomingRaces, currentRaceIndex]);

  const currentRace = upcomingRaces[currentRaceIndex];
  const currentPrediction = currentRace ? (predictions[currentRace.id] ?? null) : null;

  const resultHistory = useMemo(
    () => pointsHistory.history.filter((race) => race.has_results),
    [pointsHistory.history],
  );
  const myGlobalEntry = globalLeaderboard?.leaderboard.find((entry) => entry.user_id === user?.id);
  const stats = useMemo(() => {
    const racesWithResults = pointsHistory.summary.races_with_results;
    const totalPoints = pointsHistory.summary.total_points;
    const averageMaxPoints = Math.max(1, racesWithResults * 60);
    const rank = globalLeaderboard?.my_position ?? myGlobalEntry?.position ?? 0;
    const totalPlayers =
      globalLeaderboard?.total_players ?? globalLeaderboard?.leaderboard.length ?? 0;
    return {
      points: totalPoints,
      lastRacePoints: resultHistory[0]?.total_points ?? 0,
      gpsPlayed: racesWithResults || predictionStats?.races_participated || 0,
      precision: Math.min(100, Math.round((totalPoints / averageMaxPoints) * 100)),
      streak: Math.min(7, predictionStats?.races_participated ?? racesWithResults),
      rank,
      totalPlayers,
      tier: tierLabel(rank, totalPlayers),
    };
  }, [
    globalLeaderboard?.leaderboard.length,
    globalLeaderboard?.my_position,
    globalLeaderboard?.total_players,
    myGlobalEntry?.position,
    pointsHistory.summary.races_with_results,
    pointsHistory.summary.total_points,
    predictionStats?.races_participated,
    resultHistory,
  ]);
  const recentResults = useMemo(
    () =>
      resultHistory.slice(0, 3).map((result, index, entries) => ({
        id: result.race_id,
        flag: raceFlag(result.race_id),
        name: result.race_name.replace(" Grand Prix", " GP"),
        date: formatRaceDate(result.race_date),
        pts: result.total_points,
        trend: result.total_points >= (entries[index + 1]?.total_points ?? 0) ? "up" : "down",
      })),
    [resultHistory],
  );

  if (loading) {
    return (
      <div className="min-h-dvh bg-pk-carbon p-4 pt-16">
        <div className="max-w-[430px] mx-auto space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-md bg-pk-surface border border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-pk-carbon pb-24 max-w-[430px] mx-auto"
      data-testid="dashboard-page"
    >
      {/* ---- STICKY HEADER ---- */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between
          px-4 py-3
          bg-pk-carbon/85 backdrop-blur-[20px] saturate-[1.3]
          border-b border-white/[0.08]"
        data-testid="dashboard-header"
      >
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
          data-testid="dashboard-profile-link"
        >
          <p className="mb-0.5 text-[0.75rem] leading-tight text-pk-titane">Salut</p>
          <UserIdentity
            user={{
              id: user?.id,
              username: user?.username || "Driver",
              email: user?.email,
              avatar_id: user?.avatar_id,
              custom_avatar_url: user?.custom_avatar_url,
              level: user?.level,
            }}
            linked={false}
            size="md"
            textClassName="font-display text-[1rem] uppercase leading-tight"
          />
        </button>
        <div className="flex items-center gap-1">
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center
              text-pk-titane hover:text-pk-piste transition-colors duration-pk-short"
            onClick={openDeepSearch}
            aria-label="Rechercher"
            data-testid="dashboard-open-deep-search"
          >
            <Search {...iconSmall} size={18} />
          </button>
          <button
            className="relative w-9 h-9 rounded-full flex items-center justify-center
              text-pk-titane hover:text-pk-piste transition-colors duration-pk-short"
            onClick={() => navigate("/notifications")}
            aria-label="Notifications"
          >
            <Bell {...iconSmall} size={18} />
            <span
              className="absolute top-[6px] right-[6px] w-[5px] h-[5px]
                rounded-full bg-pk-red"
            />
          </button>
        </div>
      </header>

      {/* ---- SCROLL CONTENT ---- */}
      <motion.div
        className="p-4 flex flex-col gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* ---- HERO — NEXT RACE ---- */}
        <motion.div variants={fadeUp}>
          <RaceHeroCard
            race={currentRace}
            countdown={countdown}
            hasPrediction={!!currentPrediction}
            onPredict={() => currentRace && navigate(`/predictions/${currentRace.id}`)}
            onViewDetails={() => currentRace && navigate(`/race/${currentRace.id}`)}
          />
        </motion.div>

        {/* ---- BENTO STATS ---- */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Points */}
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-md p-3.5
              cursor-pointer hover:border-white/[0.15] transition-colors duration-pk-short"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={12} strokeWidth={1.5} className="text-pk-titane" />
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
                Points totaux
              </span>
            </div>
            <div
              className="font-mono text-[2rem] font-bold leading-none
                bg-gradient-to-br from-pk-red to-[#ff4444]
                bg-clip-text text-transparent"
            >
              {stats.points}
            </div>
            <div className="flex items-center gap-1 mt-1 text-pk-emerald">
              <TrendingUp size={12} strokeWidth={2} />
              <span className="font-mono text-[0.6875rem]">+{stats.lastRacePoints} dernier GP</span>
            </div>
            {/* Sparkline */}
            <svg viewBox="0 0 120 32" preserveAspectRatio="none" className="w-full h-8 mt-2">
              <defs>
                <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--pk-red)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--pk-red)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points="0,28 15,24 30,26 45,20 60,22 75,14 90,10 105,8 120,4 120,32 0,32"
                fill="url(#spark-fill)"
              />
              <polyline
                points="0,28 15,24 30,26 45,20 60,22 75,14 90,10 105,8 120,4"
                fill="none"
                stroke="var(--pk-red)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* Rank */}
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-md p-3.5
              cursor-pointer hover:border-white/[0.15] transition-colors duration-pk-short"
            onClick={() => navigate("/leaderboard")}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Trophy size={12} strokeWidth={1.5} className="text-pk-titane" />
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
                Rang global
              </span>
            </div>
            <div className="font-mono text-[2rem] font-bold leading-none text-pk-gold">
              {stats.rank}
              <span className="text-[1rem] text-pk-titane">e</span>
            </div>
            <p className="font-mono text-[0.625rem] text-pk-titane mt-1">
              / {stats.totalPlayers.toLocaleString("fr-FR")} joueurs
            </p>
            {/* Progress bar */}
            <div className="w-full h-1 bg-white/[0.04] rounded-sm mt-3 overflow-hidden">
              <div
                className="h-full rounded-sm bg-gradient-to-r from-pk-red to-[#ff4444]"
                style={{ width: "86%" }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[0.5rem] text-pk-titane">
                Top{" "}
                {stats.rank && stats.totalPlayers
                  ? Math.max(1, Math.round((stats.rank / stats.totalPlayers) * 100))
                  : 0}
                %
              </span>
              <span className="font-mono text-[0.5rem] text-pk-titane">{stats.tier}</span>
            </div>
          </motion.div>

          {/* Precision */}
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-md p-3.5
              cursor-pointer hover:border-white/[0.15] transition-colors duration-pk-short"
            onClick={() => navigate("/profile")}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={12} strokeWidth={1.5} className="text-pk-titane" />
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
                Précision
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[2rem] font-bold text-pk-emerald leading-none">
                {stats.precision}
              </span>
              <span className="font-mono text-[0.875rem] text-pk-emerald">%</span>
            </div>
            <div className="w-full h-1 bg-white/[0.04] rounded-sm mt-2 overflow-hidden">
              <div
                className="h-full rounded-sm bg-gradient-to-r from-pk-emerald to-[#34d399]"
                style={{ width: `${stats.precision}%` }}
              />
            </div>
            <p className="font-mono text-[0.5625rem] text-pk-titane mt-1.5">
              {stats.gpsPlayed} GP joués
            </p>
          </motion.div>

          {/* Streak */}
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-md p-3.5
              cursor-pointer hover:border-white/[0.15] transition-colors duration-pk-short"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Flame size={12} strokeWidth={1.5} className="text-pk-titane" />
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
                Série en cours
              </span>
            </div>
            <div className="font-mono text-[1.5rem] font-bold leading-none text-pk-amber">
              {stats.streak} <span className="text-[0.75rem] text-pk-titane">GP</span>
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {["E", "ER", "M", "C", "J", "S", "A"].map((day, i) => {
                const isHit = i < stats.streak;
                const isToday = i === stats.streak - 1;
                return (
                  <div
                    key={day}
                    className={`
                      w-6 h-6 rounded-sm flex items-center justify-center
                      font-mono text-[0.5625rem]
                      ${
                        isHit
                          ? "bg-pk-red-subtle text-pk-red border border-[rgba(225,6,0,0.15)]"
                          : "bg-white/[0.02] text-pk-titane border border-white/[0.08]"
                      }
                      ${isToday ? "border-pk-red shadow-[0_0_6px_rgba(225,6,0,0.3)]" : ""}
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ---- LEAGUES — HORIZONTAL SCROLL ---- */}
        {userLeagues.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-[1rem] uppercase">Mes ligues</h2>
              <button
                onClick={() => navigate("/league")}
                className="flex items-center gap-1 font-mono text-[0.6875rem] text-pk-red"
              >
                Tout voir
                <ChevronRight size={12} strokeWidth={2} />
              </button>
            </div>
            <div
              className="flex gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory
                -mx-4 px-4 pb-1 scrollbar-hide"
            >
              {userLeagues.map(
                (league: {
                  id: string;
                  name: string;
                  member_count?: number;
                  members?: unknown[];
                }) => {
                  const rank = leagueRanks[league.id];
                  const memberCount =
                    league.member_count || (league.members as unknown[])?.length || 0;
                  return (
                    <div
                      key={league.id}
                      onClick={() => navigate(`/league/${league.id}/details`)}
                      className="flex-shrink-0 w-[200px] snap-start
                      bg-pk-surface border border-white/[0.08] rounded-md p-3.5
                      cursor-pointer hover:border-white/[0.15]
                      transition-colors duration-pk-short"
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-2xl">
                          {league.id === userLeagues[0]?.id
                            ? "\u{1F3C6}"
                            : league.id === userLeagues[1]?.id
                              ? "\u{1F3AF}"
                              : "⚡"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[0.8125rem] truncate">{league.name}</p>
                          <p className="font-mono text-[0.625rem] text-pk-titane">
                            {memberCount} membres
                          </p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-[1.125rem] font-bold text-pk-gold">
                          {rank?.position ? `${rank.position}e` : "-"}
                        </span>
                        <span className="font-mono text-[0.625rem] text-pk-titane">
                          / {rank?.total || memberCount}
                        </span>
                      </div>
                      <p className="font-mono text-[0.5625rem] text-pk-titane uppercase tracking-[0.1em] mt-0.5">
                        {rank?.total_points ?? 0} pts
                      </p>
                    </div>
                  );
                },
              )}
              {/* Add league card */}
              <div
                onClick={() => navigate("/league")}
                className="flex-shrink-0 w-[140px] snap-start
                  bg-pk-surface/50 border border-dashed border-white/[0.08] rounded-md
                  flex flex-col items-center justify-center gap-2 p-3.5
                  cursor-pointer hover:border-pk-red/30
                  transition-colors duration-pk-short"
              >
                <div className="w-10 h-10 rounded-full bg-pk-red-subtle flex items-center justify-center">
                  <Plus size={18} strokeWidth={2} className="text-pk-red" />
                </div>
                <span className="font-mono text-[0.625rem] text-pk-titane text-center">
                  Rejoindre
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {userLeagues.length === 0 && (
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-md p-6 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-pk-red-subtle flex items-center justify-center">
              <Users size={24} strokeWidth={1.5} className="text-pk-red" />
            </div>
            <h3 className="font-display text-[1.125rem] uppercase mb-1">Rejoins une Ligue !</h3>
            <p className="text-[0.8125rem] text-pk-titane mb-4">
              Crée ou rejoins une ligue pour jouer avec tes potes
            </p>
            <button onClick={() => navigate("/league")} className="btn-pk text-[0.8125rem] px-6">
              <Plus {...iconSmall} size={14} strokeWidth={2} />
              C'est parti !
            </button>
          </motion.div>
        )}

        {/* ---- RECENT RESULTS ---- */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-[1rem] uppercase">Derniers résultats</h2>
            <button
              onClick={() => navigate("/results")}
              className="flex items-center gap-1 font-mono text-[0.6875rem] text-pk-red"
            >
              Historique
              <ChevronRight size={12} strokeWidth={2} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {recentResults.length === 0 && (
              <div className="bg-pk-surface border border-white/[0.08] rounded-md p-4 text-center">
                <p className="font-mono text-[0.6875rem] text-pk-titane uppercase">
                  Aucun résultat importé
                </p>
              </div>
            )}
            {recentResults.map((result) => (
              <motion.div
                key={result.id}
                variants={fadeUp}
                className="flex items-center gap-3
                  bg-pk-surface border border-white/[0.08] rounded-md p-3
                  cursor-pointer hover:border-white/[0.15]
                  transition-colors duration-pk-short"
                onClick={() => navigate(`/results/${result.id}`)}
              >
                <span className="text-[1.125rem]">{result.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[0.8125rem] truncate">{result.name}</p>
                  <p className="font-mono text-[0.625rem] text-pk-titane">{result.date}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-mono text-[1rem] font-bold ${
                      result.pts >= 70
                        ? "text-pk-emerald"
                        : result.pts >= 50
                          ? "text-pk-amber"
                          : "text-pk-titane"
                    }`}
                  >
                    +{result.pts}
                  </p>
                  <p className="font-mono text-[0.5625rem] text-pk-titane uppercase">pts</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    result.trend === "up"
                      ? "bg-[rgba(16,185,129,0.1)] text-pk-emerald"
                      : "bg-[rgba(225,6,0,0.1)] text-pk-red"
                  }`}
                >
                  {result.trend === "up" ? (
                    <TrendingUp size={14} strokeWidth={2} />
                  ) : (
                    <TrendingDown size={14} strokeWidth={2} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ---- QUICK ACTIONS ---- */}
        <motion.div variants={fadeUp}>
          <h2 className="font-display text-[1rem] uppercase mb-2">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                icon: Target,
                label: "Pickstiquer",
                sub: currentRace?.name?.replace(" Grand Prix", "") || "GP",
                color: "red" as const,
                action: () => currentRace && navigate(`/predictions/${currentRace.id}`),
              },
              {
                icon: Trophy,
                label: "Classements",
                sub: "Saison 2026",
                color: "emerald" as const,
                action: () => navigate("/leaderboard"),
              },
              {
                icon: Users,
                label: "Inviter",
                sub: "Partagez l'app",
                color: "amber" as const,
                action: () => {
                  if (navigator.share) {
                    navigator.share({
                      title: "PronoKif",
                      text: "Fais tes pronos F1 avec moi !",
                      url: window.location.origin,
                    });
                  }
                },
              },
              {
                icon: Radio,
                label: "Direct",
                sub: "Pas de course",
                color: "info" as const,
                action: () => navigate("/live"),
              },
            ].map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className="flex items-center gap-2.5
                  bg-pk-surface border border-white/[0.08] rounded-md p-3
                  cursor-pointer hover:border-white/[0.15] hover:bg-pk-anthracite
                  transition-all duration-pk-short text-left"
              >
                <div
                  className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${
                    qa.color === "red"
                      ? "bg-pk-red-subtle text-pk-red"
                      : qa.color === "emerald"
                        ? "bg-[rgba(16,185,129,0.1)] text-pk-emerald"
                        : qa.color === "amber"
                          ? "bg-[rgba(245,158,11,0.1)] text-pk-amber"
                          : "bg-[rgba(59,130,246,0.1)] text-pk-info"
                  }`}
                >
                  <qa.icon size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-[0.8125rem]">{qa.label}</p>
                  <p className="font-mono text-[0.5625rem] text-pk-titane mt-0.5">{qa.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
