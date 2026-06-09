import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flag, MapPin, Star, Trophy, Users } from "lucide-react";
import { useTeamDetailData, type TeamDriver } from "./useTeamDetailData";
import { useTeamRoster } from "./useTeamRoster";
import { TeamNavRail } from "./TeamNavRail";
import { haptic } from "@/lib/haptics";
import { getReducedMotionProps } from "@/lib/motion";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { resolveDriverPhotoUrl } from "@/lib/driverPhotos";

function TeamDetailSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="h-[320px] bg-pk-surface animate-shimmer" />
      <div className="px-4 pt-4 space-y-3 pb-24">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function TeamPageShell({
  roster,
  currentId,
  onSelect,
  mainRef,
  children,
}: {
  roster: import("./useTeamRoster").RosterTeam[];
  currentId: string | undefined;
  onSelect: (id: string, direction: "next" | "prev") => void;
  mainRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-pk-carbon">
      <TeamNavRail teams={roster} currentId={currentId} onSelect={onSelect} />
      <main
        ref={mainRef}
        className="relative flex-1 min-w-0 overflow-x-hidden pb-24"
        data-testid="team-detail-page"
      >
        {children}
      </main>
    </div>
  );
}

function DriverCard({
  driver,
  teamColor,
  onClick,
}: {
  driver: TeamDriver;
  teamColor: string;
  onClick: () => void;
}) {
  const photo = resolveDriverPhotoUrl(driver, { mode: "dark" });
  const firstName = driver.first_name || driver.id;
  const lastName = driver.last_name || "";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg bg-pk-surface border border-white/[0.08] hover:border-white/[0.16] transition-colors w-full text-left group"
    >
      <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-pk-anthracite">
        {photo ? (
          <img
            src={photo}
            alt={`${firstName} ${lastName}`}
            className="h-full w-full object-cover object-top"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Users className="w-6 h-6 text-pk-titane" />
          </div>
        )}
        <span
          className="absolute -bottom-0.5 -right-0.5 min-w-[18px] px-1 rounded-full font-data text-[9px] font-bold leading-[18px] text-center text-white"
          style={{ backgroundColor: teamColor }}
        >
          {driver.number}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm uppercase truncate">
          {firstName} <span className="text-pk-piste">{lastName}</span>
        </p>
        {driver.country_name && (
          <p className="font-data text-[0.5625rem] text-pk-titane">{driver.country_name}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-pk-titane group-hover:text-pk-piste transition-colors shrink-0" />
    </button>
  );
}

export default function TeamDetailPage() {
  const { t } = useTranslation();
  const { teamId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const { loading, team, drivers, error } = useTeamDetailData(teamId);
  const { roster } = useTeamRoster();
  const mainRef = useRef<HTMLElement>(null);

  const currentIndex = roster.findIndex((t) => t.id === teamId);
  const prevTeam = currentIndex > 0 ? roster[currentIndex - 1] : undefined;
  const nextTeam =
    currentIndex >= 0 && currentIndex < roster.length - 1 ? roster[currentIndex + 1] : undefined;

  const goTo = useCallback(
    (id: string, direction: "next" | "prev") => {
      haptic("selection");
      navigate(`/team/${id}`, { state: { dir: direction } });
    },
    [navigate],
  );
  const goPrev = useCallback(() => {
    if (prevTeam) goTo(prevTeam.id, "prev");
  }, [prevTeam, goTo]);
  const goNext = useCallback(() => {
    if (nextTeam) goTo(nextTeam.id, "next");
  }, [nextTeam, goTo]);

  useSwipeNavigation(mainRef, {
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    enabled: roster.length > 1,
  });

  useEffect(() => {
    if (error) {
      toast.error(t("team_detail.load_error", "Erreur de chargement"));
      navigate("/championship");
    }
  }, [error, navigate, t]);

  if (loading) {
    return (
      <TeamPageShell roster={roster} currentId={teamId} onSelect={goTo} mainRef={mainRef}>
        <TeamDetailSkeleton />
      </TeamPageShell>
    );
  }

  if (!team) {
    return (
      <TeamPageShell roster={roster} currentId={teamId} onSelect={goTo} mainRef={mainRef}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Users className="w-10 h-10 text-pk-titane mx-auto mb-3" />
            <p className="text-sm text-pk-titane">
              {t("team_detail.not_found", "Écurie introuvable")}
            </p>
          </div>
        </div>
      </TeamPageShell>
    );
  }

  const color = team.meta.color;
  const logoSrc = team.meta.logo_url || team.meta.logo;
  const posLabel = team.position === 1 ? "1er" : `${team.position}e`;

  return (
    <TeamPageShell roster={roster} currentId={teamId} onSelect={goTo} mainRef={mainRef}>
      {/* ═══════════════ HERO BANNER ═══════════════ */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(160deg, ${color}30 0%, ${color}15 30%, ${color}06 60%, #0B0D12 100%)`,
        }}
        {...rmProps}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />

        {/* Giant abbreviation watermark */}
        <div
          className="absolute -top-4 -right-4 font-display text-[180px] leading-none font-bold pointer-events-none select-none"
          style={{ color: `${color}10` }}
        >
          {team.meta.abbr}
        </div>

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-pk-piste hover:text-white transition-colors"
            aria-label={t("team_detail.back_label", "Retour")}
            data-testid="team-back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-heading text-sm uppercase">
              {t("team_detail.teams_label", "Écuries")}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-pk-carbon/40 backdrop-blur-sm rounded-lg">
              <button
                onClick={goPrev}
                disabled={!prevTeam}
                className="p-2 rounded-l-lg text-pk-titane hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label={t("team_detail.prev_team", "Écurie précédente")}
                title={prevTeam?.name}
                data-testid="team-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                disabled={!nextTeam}
                className="p-2 rounded-r-lg text-pk-titane hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label={t("team_detail.next_team", "Écurie suivante")}
                title={nextTeam?.name}
                data-testid="team-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 min-h-[320px]">
          {/* Team logo — large, right-aligned */}
          <motion.div
            className="absolute right-4 top-8 bottom-0 w-[45%] z-0 flex items-center justify-center"
            {...rmProps}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 0.25 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
          >
            {logoSrc && (
              <img
                src={logoSrc}
                alt={team.name}
                className="max-w-none w-full h-auto object-contain"
                style={{ filter: "brightness(1.5)" }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  if (team.meta.logo && e.currentTarget.src !== team.meta.logo) {
                    e.currentTarget.src = team.meta.logo;
                  }
                }}
              />
            )}
          </motion.div>

          {/* Left column: team info */}
          <div className="relative z-10 px-4 pt-6 pb-8 max-w-[60%]">
            {/* Logo small */}
            {logoSrc && (
              <div className="mb-4">
                <img
                  src={logoSrc}
                  alt={team.name}
                  className="h-14 w-14 object-contain"
                  style={{ filter: "brightness(1.3) contrast(1.1)" }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    if (team.meta.logo && e.currentTarget.src !== team.meta.logo) {
                      e.currentTarget.src = team.meta.logo;
                    }
                  }}
                />
              </div>
            )}

            {/* Position badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
            >
              <Trophy className="w-3 h-3" style={{ color }} />
              <span className="font-data text-xs font-bold" style={{ color }}>
                {posLabel}
              </span>
            </div>

            {/* Team name */}
            <h1 className="font-display text-[2rem] leading-[0.95] uppercase">{team.name}</h1>

            {/* Country */}
            <div className="flex items-center gap-2 mt-3">
              <Flag className="w-3.5 h-3.5 text-pk-titane" />
              <span className="font-body text-sm text-pk-titane">{team.nationality}</span>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 mt-5">
              <div>
                <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                  {t("team_detail.points", "Points")}
                </p>
                <p className="font-data text-base font-bold text-pk-piste">{team.points}</p>
              </div>
              <div className="border-l border-white/[0.08] pl-4">
                <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                  {t("team_detail.wins", "Victoires")}
                </p>
                <p className="font-data text-base font-bold text-pk-piste">{team.wins}</p>
              </div>
              <div className="border-l border-white/[0.08] pl-4">
                <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                  {t("team_detail.drivers_count", "Pilotes")}
                </p>
                <p className="font-data text-base font-bold text-pk-piste">{drivers.length}</p>
              </div>
            </div>

            {/* Follow button */}
            <button
              onClick={() => {
                haptic("medium");
                toast.success(t("team_detail.followed", "Écurie suivie !"));
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs uppercase tracking-wider hover:bg-white/5 transition-colors font-data"
              style={{ borderColor: `${color}60`, color }}
            >
              <Star className="w-3.5 h-3.5" />
              {t("team_detail.follow", "Suivre")}
            </button>
          </div>
        </div>

        {/* Diagonal stripes */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 18px, ${color} 18px, ${color} 19px)`,
          }}
        />

        {/* Bottom gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to top, var(--pk-carbon) 0%, transparent 100%)",
          }}
        />
      </motion.div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* ── Season stats ── */}
        <motion.div
          className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="font-heading text-sm uppercase tracking-wide mb-4">
            {t("team_detail.season", {
              year: new Date().getFullYear(),
              defaultValue: `Saison ${new Date().getFullYear()}`,
            })}
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Trophy className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("team_detail.ranking", "Classement")}
              </p>
              <p className="font-data text-2xl font-bold text-pk-piste">{posLabel}</p>
            </div>
            <div>
              <Flag className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("team_detail.total_points", "Points")}
              </p>
              <p className="font-data text-2xl font-bold" style={{ color }}>
                {team.points}
              </p>
            </div>
            <div>
              <MapPin className="w-4 h-4 mx-auto text-pk-titane mb-1" />
              <p className="font-data text-[0.5rem] uppercase text-pk-titane">
                {t("team_detail.victories", "Victoires")}
              </p>
              <p className="font-data text-2xl font-bold text-pk-amber">{team.wins}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Drivers ── */}
        {drivers.length > 0 && (
          <motion.div
            className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            {...rmProps}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h2 className="font-heading text-sm uppercase tracking-wide mb-3">
              {t("team_detail.our_drivers", "Pilotes")}
            </h2>
            <div className="space-y-2">
              {drivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  teamColor={color}
                  onClick={() => {
                    haptic("selection");
                    navigate(`/driver/${driver.id}`);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── CTA Pronostiquer ── */}
        <motion.button
          onClick={() => navigate("/predictions")}
          className="w-full flex items-center justify-between p-4 rounded-lg bg-pk-red hover:bg-pk-red-hover transition-colors"
          {...rmProps}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-heading text-sm uppercase text-white">
                {t("team_detail.predict_performance", "Pronostiquer")}
              </p>
              <p className="font-body text-xs text-white/70">
                {t(
                  "team_detail.predict_desc",
                  "Prédisez les résultats des pilotes de cette écurie",
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white font-heading text-xs uppercase">
            {t("team_detail.predict_cta", "Pronostiquer")} <ChevronRight className="w-4 h-4" />
          </div>
        </motion.button>
      </div>
    </TeamPageShell>
  );
}
