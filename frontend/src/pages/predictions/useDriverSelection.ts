/**
 * Hook encapsulating driver selection logic for both sprint and main race.
 * Keeps the switch/case dispatch out of the page component.
 */

interface UseDriverSelectionParams {
  activeTab: string;
  selectionMode: string;
  setSelectionMode: (mode: string) => void;
  sprintQualiPole: string | null;
  setSprintQualiPole: (v: string | null) => void;
  sprintQualiTop10: string[];
  setSprintQualiTop10: (v: string[]) => void;
  sprintRaceWinner: string | null;
  setSprintRaceWinner: (v: string | null) => void;
  sprintRaceTop10: string[];
  setSprintRaceTop10: (v: string[]) => void;
  sprintFastestLap: string | null;
  setSprintFastestLap: (v: string | null) => void;
  sprintFirstCorner: string | null;
  setSprintFirstCorner: (v: string | null) => void;
  sprintDnfDrivers: string[];
  setSprintDnfDrivers: (v: string[]) => void;
  qualiPole: string | null;
  setQualiPole: (v: string | null) => void;
  qualiTop10: string[];
  setQualiTop10: (v: string[]) => void;
  raceWinner: string | null;
  setRaceWinner: (v: string | null) => void;
  raceTop10: string[];
  setRaceTop10: (v: string[]) => void;
  fastestLapDriver: string | null;
  setFastestLapDriver: (v: string | null) => void;
  firstCornerLeader: string | null;
  setFirstCornerLeader: (v: string | null) => void;
  dnfDrivers: string[];
  setDnfDrivers: (v: string[]) => void;
}

export function useDriverSelection({
  activeTab,
  selectionMode,
  setSelectionMode,
  sprintQualiPole,
  setSprintQualiPole,
  sprintQualiTop10,
  setSprintQualiTop10,
  sprintRaceWinner,
  setSprintRaceWinner,
  sprintRaceTop10,
  setSprintRaceTop10,
  sprintFastestLap,
  setSprintFastestLap,
  sprintFirstCorner,
  setSprintFirstCorner,
  sprintDnfDrivers,
  setSprintDnfDrivers,
  qualiPole,
  setQualiPole,
  qualiTop10,
  setQualiTop10,
  raceWinner,
  setRaceWinner,
  raceTop10,
  setRaceTop10,
  fastestLapDriver,
  setFastestLapDriver,
  firstCornerLeader,
  setFirstCornerLeader,
  dnfDrivers,
  setDnfDrivers,
}: UseDriverSelectionParams) {
  const handleDriverSelect = (driverId: string): void => {
    if (activeTab === "sprint") handleSprintSelect(driverId);
    else handleMainSelect(driverId);
  };

  const handleSprintSelect = (driverId: string): void => {
    switch (selectionMode) {
      case "sprint_quali_pole":
        setSprintQualiPole(driverId);
        if (sprintQualiTop10.length < 10) setSelectionMode("sprint_quali_top10");
        break;
      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId)) {
          setSprintQualiTop10(sprintQualiTop10.filter((d) => d !== driverId));
        } else if (sprintQualiTop10.length < 10) {
          const n = [...sprintQualiTop10, driverId];
          setSprintQualiTop10(n);
          if (n.length === 10 && !sprintRaceWinner) setSelectionMode("sprint_race_winner");
        }
        break;
      case "sprint_race_winner":
        setSprintRaceWinner(driverId);
        if (sprintRaceTop10.length < 10) setSelectionMode("sprint_race_top10");
        break;
      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId)) {
          setSprintRaceTop10(sprintRaceTop10.filter((d) => d !== driverId));
        } else if (sprintRaceTop10.length < 10) {
          const n = [...sprintRaceTop10, driverId];
          setSprintRaceTop10(n);
          if (n.length === 10) setSelectionMode("sprint_bonus");
        }
        break;
      case "sprint_fastest_lap":
        setSprintFastestLap(driverId === sprintFastestLap ? null : driverId);
        setSelectionMode("sprint_bonus");
        break;
      case "sprint_first_corner":
        setSprintFirstCorner(driverId === sprintFirstCorner ? null : driverId);
        setSelectionMode("sprint_bonus");
        break;
      case "sprint_dnf_select":
        if (sprintDnfDrivers.includes(driverId)) {
          setSprintDnfDrivers(sprintDnfDrivers.filter((d) => d !== driverId));
        } else if (sprintDnfDrivers.length < 5) {
          setSprintDnfDrivers([...sprintDnfDrivers, driverId]);
        }
        break;
      default:
        break;
    }
  };

  const handleMainSelect = (driverId: string): void => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        if (qualiTop10.length < 10) setSelectionMode("quali_top10");
        break;
      case "quali_top10":
        if (qualiTop10.includes(driverId)) {
          setQualiTop10(qualiTop10.filter((d) => d !== driverId));
        } else if (qualiTop10.length < 10) {
          const n = [...qualiTop10, driverId];
          setQualiTop10(n);
          if (n.length === 10 && !raceWinner) setSelectionMode("race_winner");
        }
        break;
      case "race_winner":
        setRaceWinner(driverId);
        if (raceTop10.length < 10) setSelectionMode("race_top10");
        break;
      case "race_top10":
        if (raceTop10.includes(driverId)) {
          setRaceTop10(raceTop10.filter((d) => d !== driverId));
        } else if (raceTop10.length < 10) {
          const n = [...raceTop10, driverId];
          setRaceTop10(n);
          if (n.length === 10) setSelectionMode("bonus");
        }
        break;
      case "fastest_lap":
        setFastestLapDriver(driverId === fastestLapDriver ? null : driverId);
        setSelectionMode("bonus");
        break;
      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId);
        setSelectionMode("bonus");
        break;
      case "dnf_select":
        if (dnfDrivers.includes(driverId)) {
          setDnfDrivers(dnfDrivers.filter((d) => d !== driverId));
        } else if (dnfDrivers.length < 5) {
          setDnfDrivers([...dnfDrivers, driverId]);
        }
        break;
      default:
        break;
    }
  };

  const isDriverSelected = (driverId: string): boolean => {
    if (activeTab === "sprint") {
      switch (selectionMode) {
        case "sprint_quali_pole":
          return sprintQualiPole === driverId;
        case "sprint_quali_top10":
          return sprintQualiTop10.includes(driverId);
        case "sprint_race_winner":
          return sprintRaceWinner === driverId;
        case "sprint_race_top10":
          return sprintRaceTop10.includes(driverId);
        case "sprint_fastest_lap":
          return sprintFastestLap === driverId;
        case "sprint_first_corner":
          return sprintFirstCorner === driverId;
        case "sprint_dnf_select":
          return sprintDnfDrivers.includes(driverId);
        default:
          return false;
      }
    }
    switch (selectionMode) {
      case "quali_pole":
        return qualiPole === driverId;
      case "quali_top10":
        return qualiTop10.includes(driverId);
      case "race_winner":
        return raceWinner === driverId;
      case "race_top10":
        return raceTop10.includes(driverId);
      case "fastest_lap":
        return fastestLapDriver === driverId;
      case "first_corner":
        return firstCornerLeader === driverId;
      case "dnf_select":
        return dnfDrivers.includes(driverId);
      default:
        return false;
    }
  };

  return { handleDriverSelect, isDriverSelected };
}
