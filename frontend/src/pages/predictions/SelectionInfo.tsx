import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

// ----------------------------------------------------------- types ---

export interface SelectionInfoProps {
  selectionMode: string;
  sprintQualiTop10: string[];
  sprintRaceTop10: string[];
  sprintDnfDrivers: string[];
  qualiTop10: string[];
  raceTop10: string[];
  dnfDrivers: string[];
}

// ----------------------------------------------------------- component ---

export default function SelectionInfo({
  selectionMode,
  sprintQualiTop10,
  sprintRaceTop10,
  sprintDnfDrivers,
  qualiTop10,
  raceTop10,
  dnfDrivers,
}: SelectionInfoProps) {
  const { t } = useTranslation();
  const messageByMode: Record<string, string> = {
    sprint_quali_pole: t("predictions.form.selection.sprint_quali_pole"),
    sprint_quali_top10: t("predictions.form.selection.sprint_quali_top10", {
      count: sprintQualiTop10.length,
    }),
    sprint_race_winner: t("predictions.form.selection.sprint_race_winner"),
    sprint_race_top10: t("predictions.form.selection.sprint_race_top10", {
      count: sprintRaceTop10.length,
    }),
    sprint_bonus: t("predictions.form.selection.sprint_bonus"),
    sprint_fastest_lap: t("predictions.form.selection.sprint_fastest_lap"),
    sprint_first_corner: t("predictions.form.selection.sprint_first_corner"),
    sprint_dnf_select: t("predictions.form.selection.sprint_dnf_select", {
      count: sprintDnfDrivers.length,
    }),
    quali_pole: t("predictions.form.selection.quali_pole"),
    quali_top10: t("predictions.form.selection.quali_top10", { count: qualiTop10.length }),
    race_winner: t("predictions.form.selection.race_winner"),
    race_top10: t("predictions.form.selection.race_top10", { count: raceTop10.length }),
    bonus: t("predictions.form.selection.bonus"),
    fastest_lap: t("predictions.form.selection.fastest_lap"),
    first_corner: t("predictions.form.selection.first_corner"),
    dnf_select: t("predictions.form.selection.dnf_select", { count: dnfDrivers.length }),
  };

  return (
    <div
      className="rounded-sm border border-white/[0.08] bg-pk-surface/80 px-3 py-2 shadow-[inset_2px_0_0_rgba(225,6,0,0.5)]"
      role="status"
      data-testid="prediction-selection-info"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={selectionMode}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-pk-red/25 bg-pk-red-subtle text-pk-red">
            <Radio size={12} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-data text-[0.48rem] uppercase tracking-[0.14em] text-pk-titane">
              {t("predictions.form.now_selecting")}
            </p>
            <p className="truncate text-[0.75rem] leading-4 text-pk-piste">
              {messageByMode[selectionMode] ?? ""}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
