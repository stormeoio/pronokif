import { motion, AnimatePresence } from "framer-motion";
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
          {activeTab === "sprint" ? (
            <>
              {selectionMode === "sprint_quali_pole" && "Select the Sprint Qualifying pole sitter"}
              {selectionMode === "sprint_quali_top10" &&
                `Selectionnez le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
              {selectionMode === "sprint_race_winner" && "Select the Sprint Race winner"}
              {selectionMode === "sprint_race_top10" &&
                `Select the Sprint Race Top 10 (${sprintRaceTop10.length}/10)`}
              {selectionMode === "sprint_bonus" && "Configure your sprint bonus picks"}
              {selectionMode === "sprint_fastest_lap" &&
                "Select the driver who will set the Sprint fastest lap"}
              {selectionMode === "sprint_first_corner" &&
                "Selectionnez le leader au premier virage du sprint"}
              {selectionMode === "sprint_dnf_select" &&
                `Selectionnez les abandons sprint (${sprintDnfDrivers.length}/5)`}
            </>
          ) : (
            <>
              {selectionMode === "quali_pole" && "Select the pole sitter"}
              {selectionMode === "quali_top10" &&
                `Selectionnez le Top 10 des qualifications (${qualiTop10.length}/10)`}
              {selectionMode === "race_winner" && "Select the race winner"}
              {selectionMode === "race_top10" && `Select the race Top 10 (${raceTop10.length}/10)`}
              {selectionMode === "bonus" && "Configure your bonus picks"}
              {selectionMode === "fastest_lap" && "Select the driver who will set the fastest lap"}
              {selectionMode === "first_corner" && "Selectionnez le leader au premier virage"}
              {selectionMode === "dnf_select" &&
                `Selectionnez les abandons (${dnfDrivers.length}/5)`}
            </>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
