import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export type SelectionMode =
  | "quali_pole"
  | "quali_top10"
  | "sprint_quali_pole"
  | "sprint_quali_top10"
  | "sprint_race_winner"
  | "sprint_race_top10"
  | "race_winner"
  | "race_top10"
  | "fastest_lap"
  | "first_corner"
  | "dnf_select";

interface Race {
  id: number | string;
  has_results: boolean;
  is_sprint: boolean;
  [key: string]: unknown;
}

interface ResultsData {
  quali_pole?: string | null;
  quali_top10?: string[];
  sprint_quali_pole?: string | null;
  sprint_quali_top10?: string[];
  sprint_race_winner?: string | null;
  sprint_race_top10?: string[];
  race_winner?: string | null;
  race_top10?: string[];
  bonus?: {
    safety_car?: boolean | null;
    dnf_drivers?: string[];
    fastest_lap?: string | null;
    first_corner_leader?: string | null;
  };
}

interface SyncFetchedData {
  quali_pole?: string | null;
  quali_top10?: string[];
  sprint_quali_pole?: string | null;
  sprint_quali_top10?: string[];
  sprint_race_winner?: string | null;
  sprint_race_top10?: string[];
  race_winner?: string | null;
  race_top10?: string[];
  bonus?: {
    safety_car?: boolean | null;
    dnf_drivers?: string[];
    fastest_lap?: string | null;
    first_corner_leader?: string | null;
  };
}

interface UseResultsStateParams {
  setRaces: (races: Race[]) => void;
}

interface UseResultsStateReturn {
  selectedRace: Race | null;
  selectRace: (race: Race) => Promise<void>;
  saving: boolean;
  syncing: boolean;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  qualiPole: string | null;
  qualiTop10: string[];
  sprintQualiPole: string | null;
  sprintQualiTop10: string[];
  sprintRaceWinner: string | null;
  sprintRaceTop10: string[];
  raceWinner: string | null;
  raceTop10: string[];
  safetyCar: boolean;
  setSafetyCar: (value: boolean) => void;
  dnfDrivers: string[];
  setDnfDrivers: (drivers: string[]) => void;
  fastestLap: string | null;
  firstCornerLeader: string | null;
  handleDriverSelect: (driverId: string) => void;
  isDriverSelected: (driverId: string) => boolean;
  getDriverPosition: (driverId: string) => number | null;
  isCompletee: boolean | string | null;
  handleSubmit: () => Promise<void>;
  handleSyncOpenF1: () => Promise<void>;
}

/**
 * Custom hook encapsulating all results-related state and logic
 * (driver selection, sync, submit, race loading).
 */
export function useResultsState({ setRaces }: UseResultsStateParams): UseResultsStateReturn {
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Results state
  const [qualiPole, setQualiPole] = useState<string | null>(null);
  const [qualiTop10, setQualiTop10] = useState<string[]>([]);
  const [sprintQualiPole, setSprintQualiPole] = useState<string | null>(null);
  const [sprintQualiTop10, setSprintQualiTop10] = useState<string[]>([]);
  const [sprintRaceWinner, setSprintRaceWinner] = useState<string | null>(null);
  const [sprintRaceTop10, setSprintRaceTop10] = useState<string[]>([]);
  const [raceWinner, setRaceWinner] = useState<string | null>(null);
  const [raceTop10, setRaceTop10] = useState<string[]>([]);

  // Bonus results
  const [safetyCar, setSafetyCar] = useState(false);
  const [dnfDrivers, setDnfDrivers] = useState<string[]>([]);
  const [fastestLap, setFastestLap] = useState<string | null>(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>("quali_pole");

  const resetForm = (): void => {
    setQualiPole(null);
    setQualiTop10([]);
    setSprintQualiTop10([]);
    setSprintRaceTop10([]);
    setRaceWinner(null);
    setRaceTop10([]);
    setSafetyCar(false);
    setDnfDrivers([]);
    setFastestLap(null);
    setFirstCornerLeader(null);
    setSelectionMode("quali_pole");
  };

  const selectRace = async (race: Race): Promise<void> => {
    setSelectedRace(race);
    resetForm();

    if (race.has_results) {
      try {
        const data = (await api.admin.results(String(race.id))) as { results?: ResultsData };
        if (data?.results) {
          const r = data.results;
          setQualiPole(r.quali_pole ?? null);
          setQualiTop10(r.quali_top10 ?? []);
          setSprintQualiPole(r.sprint_quali_pole ?? null);
          setSprintQualiTop10(r.sprint_quali_top10 ?? []);
          setSprintRaceWinner(r.sprint_race_winner ?? null);
          setSprintRaceTop10(r.sprint_race_top10 ?? []);
          setRaceWinner(r.race_winner ?? null);
          setRaceTop10(r.race_top10 ?? []);
          setSafetyCar(r.bonus?.safety_car ?? false);
          setDnfDrivers(r.bonus?.dnf_drivers ?? []);
          setFastestLap(r.bonus?.fastest_lap ?? null);
          setFirstCornerLeader(r.bonus?.first_corner_leader ?? null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDriverSelect = (driverId: string): void => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        break;
      case "quali_top10":
        if (qualiTop10.includes(driverId)) setQualiTop10(qualiTop10.filter((d) => d !== driverId));
        else if (qualiTop10.length < 10) setQualiTop10([...qualiTop10, driverId]);
        break;
      case "sprint_quali_pole":
        setSprintQualiPole(driverId);
        break;
      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId))
          setSprintQualiTop10(sprintQualiTop10.filter((d) => d !== driverId));
        else if (sprintQualiTop10.length < 10) setSprintQualiTop10([...sprintQualiTop10, driverId]);
        break;
      case "sprint_race_winner":
        setSprintRaceWinner(driverId);
        break;
      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId))
          setSprintRaceTop10(sprintRaceTop10.filter((d) => d !== driverId));
        else if (sprintRaceTop10.length < 10) setSprintRaceTop10([...sprintRaceTop10, driverId]);
        break;
      case "race_winner":
        setRaceWinner(driverId);
        break;
      case "race_top10":
        if (raceTop10.includes(driverId)) setRaceTop10(raceTop10.filter((d) => d !== driverId));
        else if (raceTop10.length < 10) setRaceTop10([...raceTop10, driverId]);
        break;
      case "fastest_lap":
        setFastestLap(driverId === fastestLap ? null : driverId);
        break;
      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId);
        break;
      case "dnf_select":
        if (dnfDrivers.includes(driverId)) setDnfDrivers(dnfDrivers.filter((d) => d !== driverId));
        else setDnfDrivers([...dnfDrivers, driverId]);
        break;
      default:
        break;
    }
  };

  const isDriverSelected = (driverId: string): boolean => {
    switch (selectionMode) {
      case "quali_pole":
        return qualiPole === driverId;
      case "quali_top10":
        return qualiTop10.includes(driverId);
      case "sprint_quali_pole":
        return sprintQualiPole === driverId;
      case "sprint_quali_top10":
        return sprintQualiTop10.includes(driverId);
      case "sprint_race_winner":
        return sprintRaceWinner === driverId;
      case "sprint_race_top10":
        return sprintRaceTop10.includes(driverId);
      case "race_winner":
        return raceWinner === driverId;
      case "race_top10":
        return raceTop10.includes(driverId);
      case "fastest_lap":
        return fastestLap === driverId;
      case "first_corner":
        return firstCornerLeader === driverId;
      case "dnf_select":
        return dnfDrivers.includes(driverId);
      default:
        return false;
    }
  };

  const getDriverPosition = (driverId: string): number | null => {
    if (selectionMode === "quali_top10") return qualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_quali_top10")
      return sprintQualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_race_top10") return sprintRaceTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "race_top10") return raceTop10.indexOf(driverId) + 1 || null;
    return null;
  };

  const isSprintCompletee =
    !selectedRace?.is_sprint ||
    (sprintQualiPole &&
      sprintQualiTop10.length === 10 &&
      sprintRaceWinner &&
      sprintRaceTop10.length === 10);
  const isCompletee =
    qualiPole &&
    qualiTop10.length === 10 &&
    raceWinner &&
    raceTop10.length === 10 &&
    isSprintCompletee;

  const handleSubmit = async (): Promise<void> => {
    if (!isCompletee) {
      toast.error("Completee all required results");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        quali_pole: qualiPole,
        quali_top10: qualiTop10,
        race_winner: raceWinner,
        race_top10: raceTop10,
        safety_car: safetyCar,
        dnf_drivers: dnfDrivers,
        fastest_lap: fastestLap,
        first_corner_leader: firstCornerLeader,
      };
      if (selectedRace?.is_sprint) {
        payload["sprint_quali_pole"] = sprintQualiPole;
        payload["sprint_quali_top10"] = sprintQualiTop10;
        payload["sprint_race_winner"] = sprintRaceWinner;
        payload["sprint_race_top10"] = sprintRaceTop10;
      }
      await api.admin.saveResults(String(selectedRace!.id), payload);
      toast.success("Resultats enregistres ! Les points ont ete calcules.");
      const racesData = await api.admin.races();
      setRaces(racesData as unknown as Race[]);
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      toast.error(axiosError.response?.data?.detail ?? "Error while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncOpenF1 = async (): Promise<void> => {
    if (!selectedRace) return;
    setSyncing(true);
    try {
      const resData = (await api.admin.syncResults(String(selectedRace.id))) as unknown as {
        status: string;
        message?: string;
        fetched_data: SyncFetchedData;
        success_items?: string[];
        errors?: string[];
      };
      if (resData.status === "success" || resData.status === "partial") {
        const f = resData.fetched_data;
        if (f.quali_pole) setQualiPole(f.quali_pole);
        if (f.quali_top10?.length) setQualiTop10(f.quali_top10);
        if (f.sprint_quali_pole) setSprintQualiPole(f.sprint_quali_pole);
        if (f.sprint_quali_top10?.length) setSprintQualiTop10(f.sprint_quali_top10);
        if (f.sprint_race_winner) setSprintRaceWinner(f.sprint_race_winner);
        if (f.sprint_race_top10?.length) setSprintRaceTop10(f.sprint_race_top10);
        if (f.race_winner) setRaceWinner(f.race_winner);
        if (f.race_top10?.length) setRaceTop10(f.race_top10);
        if (f.bonus) {
          if (f.bonus.safety_car !== null && f.bonus.safety_car !== undefined)
            setSafetyCar(f.bonus.safety_car);
          if (f.bonus.dnf_drivers?.length) setDnfDrivers(f.bonus.dnf_drivers);
          if (f.bonus.fastest_lap) setFastestLap(f.bonus.fastest_lap);
          if (f.bonus.first_corner_leader) setFirstCornerLeader(f.bonus.first_corner_leader);
        }
        const items = resData.success_items ?? [];
        if (items.length > 0)
          toast.success(`Data fetched automatically!\n${items.join(", ")}`, {
            duration: 5000,
          });
        else toast.warning("No data available via l'API. Saisie manuelle requise.");
        if ((resData.errors?.length ?? 0) > 0) console.warn("Sync errors:", resData.errors);
      } else {
        toast.warning(resData.message ?? "Data unavailable, manual entry required.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Error while syncing with APIs");
    } finally {
      setSyncing(false);
    }
  };

  return {
    selectedRace,
    selectRace,
    saving,
    syncing,
    selectionMode,
    setSelectionMode,
    qualiPole,
    qualiTop10,
    sprintQualiPole,
    sprintQualiTop10,
    sprintRaceWinner,
    sprintRaceTop10,
    raceWinner,
    raceTop10,
    safetyCar,
    setSafetyCar,
    dnfDrivers,
    setDnfDrivers,
    fastestLap,
    firstCornerLeader,
    handleDriverSelect,
    isDriverSelected,
    getDriverPosition,
    isCompletee,
    handleSubmit,
    handleSyncOpenF1,
  };
}
