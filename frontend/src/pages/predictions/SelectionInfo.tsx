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
              {selectionMode === "sprint_quali_pole" && "Sélectionne le poleman des qualifs sprint"}
              {selectionMode === "sprint_quali_top10" &&
                `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
              {selectionMode === "sprint_race_winner" && "Sélectionne le vainqueur du sprint"}
              {selectionMode === "sprint_race_top10" &&
                `Sélectionne le Top 10 du sprint (${sprintRaceTop10.length}/10)`}
              {selectionMode === "sprint_bonus" && "Configure tes bonus sprint"}
              {selectionMode === "sprint_fastest_lap" &&
                "Sélectionne le pilote qui fera le meilleur tour du sprint"}
              {selectionMode === "sprint_first_corner" &&
                "Sélectionne le leader au premier virage du sprint"}
              {selectionMode === "sprint_dnf_select" &&
                `Sélectionne les abandons sprint (${sprintDnfDrivers.length}/5)`}
            </>
          ) : (
            <>
              {selectionMode === "quali_pole" && "Sélectionne le poleman"}
              {selectionMode === "quali_top10" &&
                `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
              {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
              {selectionMode === "race_top10" &&
                `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
              {selectionMode === "bonus" && "Configure tes bonus"}
              {selectionMode === "fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour"}
              {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
              {selectionMode === "dnf_select" &&
                `Sélectionne les abandons (${dnfDrivers.length}/5)`}
            </>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
