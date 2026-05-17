import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="game-card">
      <CardContent className="p-4">
        <AnimatePresence mode="wait">
        <motion.p
          key={selectionMode}
          className="font-body text-gray-300 text-sm"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "sprint" ? (
            <>
              {selectionMode === "sprint_quali_pole" &&
                "Sélectionne le pilote en pole des qualifs sprint"}
              {selectionMode === "sprint_quali_top10" &&
                `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
              {selectionMode === "sprint_race_winner" &&
                "Sélectionne le vainqueur de la course sprint"}
              {selectionMode === "sprint_race_top10" &&
                `Sélectionne le Top 10 de la course sprint (${sprintRaceTop10.length}/10)`}
              {selectionMode === "sprint_bonus" && "Configure tes paris bonus sprint"}
              {selectionMode === "sprint_fastest_lap" &&
                "Sélectionne le pilote qui fera le meilleur tour sprint"}
              {selectionMode === "sprint_first_corner" &&
                "Sélectionne le leader au premier virage du sprint"}
              {selectionMode === "sprint_dnf_select" &&
                `Sélectionne les abandons sprint (${sprintDnfDrivers.length}/5)`}
            </>
          ) : (
            <>
              {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
              {selectionMode === "quali_top10" &&
                `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
              {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
              {selectionMode === "race_top10" &&
                `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
              {selectionMode === "bonus" && "Configure tes paris bonus"}
              {selectionMode === "fastest_lap" && "Sélectionne le pilote qui fera le meilleur tour"}
              {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
              {selectionMode === "dnf_select" &&
                `Sélectionne les abandons (${dnfDrivers.length}/5)`}
            </>
          )}
        </motion.p>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
