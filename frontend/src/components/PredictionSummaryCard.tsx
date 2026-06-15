/**
 * PredictionSummaryCard — read-only recap of the user's submitted picks for a GP.
 *
 * Rendered on the Pronos tab of the GP fiche so a user who has already played can
 * review their picks (and, while predictions are open, jump out to modify them)
 * without leaving the tab. Pure display — editing is delegated to the predictions
 * page. Resolves driver references to names/codes via the shared driver lookup.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Flag, Trophy, Zap, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { fadeUp } from "@/lib/motion";
import { buildDriverLookup, resolveDriverReference } from "@/components/entities/driverEntityUtils";
import type { BonusBets, Prediction } from "@/types/api";

interface PredictionSummaryCardProps {
  prediction: Prediction;
  isSprintWeekend?: boolean;
  /** Shows a lock chip in the header when predictions are closed. */
  locked?: boolean;
}

export default function PredictionSummaryCard({
  prediction,
  isSprintWeekend = false,
  locked = false,
}: PredictionSummaryCardProps) {
  const { t } = useTranslation();

  const { data: drivers = [] } = useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: () => api.drivers.list(),
    staleTime: 60 * 60 * 1000,
  });

  const lookup = useMemo(() => buildDriverLookup(drivers), [drivers]);

  const name = (ref?: string | null): string => {
    if (!ref) return "—";
    const d = resolveDriverReference(ref, lookup);
    return d ? d.last_name || d.name : String(ref);
  };
  const code = (ref?: string | null): string => {
    if (!ref) return "—";
    const d = resolveDriverReference(ref, lookup);
    return d ? d.code || d.last_name || d.name : String(ref);
  };

  const renderTop10 = (top10?: string[] | null) => {
    if (!top10 || top10.length === 0) return null;
    return (
      <div className="mt-2">
        <p className="mb-1 font-data text-[0.5rem] uppercase tracking-[0.12em] text-pk-titane/70">
          {t("grand_prix.picks.top10")}
        </p>
        <div className="flex flex-wrap gap-1">
          {top10.map((ref, i) => (
            <span
              key={`${ref}-${i}`}
              className="inline-flex items-center gap-1 rounded-sm bg-pk-anthracite/60 px-1.5 py-0.5 font-data text-[0.625rem] tabular-nums text-pk-piste"
            >
              <span className="text-pk-titane">{i + 1}</span>
              {code(ref)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderGroup = (
    key: string,
    icon: ReactNode,
    title: string,
    headlineLabel: string,
    headlineRef?: string | null,
    top10?: string[] | null,
  ) => (
    <div className="px-3.5 py-3" key={key}>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="font-data text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
          {title}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-data text-[0.5625rem] uppercase tracking-[0.1em] text-pk-titane">
          {headlineLabel}
        </span>
        <span className="truncate font-display text-[0.875rem] text-pk-piste">
          {name(headlineRef)}
        </span>
      </div>
      {renderTop10(top10)}
    </div>
  );

  const renderBonus = (key: string, bonus: BonusBets) => {
    const dnf = bonus.dnf_drivers ?? [];
    const rows: { label: string; value: string }[] = [
      {
        label: t("grand_prix.picks.safety_car"),
        value: bonus.safety_car ? t("grand_prix.picks.yes") : t("grand_prix.picks.no"),
      },
      { label: t("grand_prix.picks.fastest_lap"), value: name(bonus.fastest_lap_driver) },
      { label: t("grand_prix.picks.first_corner"), value: name(bonus.first_corner_leader) },
      {
        label: t("grand_prix.picks.dnf"),
        value: dnf.length ? dnf.map(code).join(", ") : t("grand_prix.picks.no_dnf"),
      },
    ];
    return (
      <div className="px-3.5 py-3" key={key}>
        <div className="mb-2 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-pk-amber" />
          <span className="font-data text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
            {t("grand_prix.picks.bonus")}
          </span>
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-2">
              <span className="font-data text-[0.5625rem] uppercase tracking-[0.1em] text-pk-titane">
                {r.label}
              </span>
              <span className="truncate text-right text-[0.8125rem] text-pk-piste">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasMain = Boolean(
    prediction.quali_pole || prediction.race_winner || prediction.race_top10?.length,
  );
  const hasSprint = Boolean(
    prediction.sprint_quali_top10?.length || prediction.sprint_race_top10?.length,
  );

  return (
    <motion.div
      variants={fadeUp}
      className="overflow-hidden rounded-lg border border-white/[0.08] bg-pk-surface"
      data-testid="prediction-summary"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5">
        <span className="font-display text-[0.8125rem] uppercase tracking-[0.04em] text-pk-piste">
          {t("grand_prix.picks.your_picks")}
        </span>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-data text-[0.5rem] uppercase tracking-[0.1em] text-pk-titane">
            <Lock className="h-2.5 w-2.5" />
            {t("grand_prix.picks.locked")}
          </span>
        )}
      </div>

      <div className="divide-y divide-white/[0.06]">
        {hasMain && (
          <>
            {renderGroup(
              "quali",
              <Flag className="h-3.5 w-3.5 text-purple-400" />,
              t("grand_prix.picks.qualifying"),
              t("grand_prix.picks.pole"),
              prediction.quali_pole,
              prediction.quali_top10,
            )}
            {renderGroup(
              "race",
              <Trophy className="h-3.5 w-3.5 text-pk-red" />,
              t("grand_prix.picks.race"),
              t("grand_prix.picks.winner"),
              prediction.race_winner,
              prediction.race_top10,
            )}
            {prediction.bonus_bets && renderBonus("bonus", prediction.bonus_bets)}
          </>
        )}

        {isSprintWeekend && hasSprint && (
          <>
            {prediction.sprint_quali_top10?.length
              ? renderGroup(
                  "sprint-quali",
                  <Zap className="h-3.5 w-3.5 text-pk-amber" />,
                  t("grand_prix.picks.sprint_quali"),
                  t("grand_prix.picks.pole"),
                  prediction.sprint_quali_top10[0],
                  prediction.sprint_quali_top10,
                )
              : null}
            {prediction.sprint_race_top10?.length
              ? renderGroup(
                  "sprint-race",
                  <Zap className="h-3.5 w-3.5 text-pk-amber" />,
                  t("grand_prix.picks.sprint_race"),
                  t("grand_prix.picks.winner"),
                  prediction.sprint_race_top10[0],
                  prediction.sprint_race_top10,
                )
              : null}
            {prediction.sprint_bonus_bets &&
              renderBonus("sprint-bonus", prediction.sprint_bonus_bets)}
          </>
        )}
      </div>
    </motion.div>
  );
}
