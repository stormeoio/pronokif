import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { easing, duration } from "@/lib/motion";

// ----------------------------------------------------------- types ---

export interface SelectionInfoProps {
  activeTab: string;
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
  activeTab,
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
    <div className="bg-pk-surface border border-white/[0.08] rounded-md px-4 py-3">
      <AnimatePresence mode="wait">
        <motion.p
          key={selectionMode}
          className="text-[0.8125rem] text-pk-titane"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 6 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {messageByMode[selectionMode] ?? ""}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
