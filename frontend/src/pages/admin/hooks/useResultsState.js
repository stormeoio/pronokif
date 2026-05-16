import { useState } from "react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

/**
 * Custom hook encapsulating all results-related state and logic
 * (driver selection, sync, submit, race loading).
 */
export function useResultsState({ setRaces }) {
  const [selectedRace, setSelectedRace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Results state
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop10, setQualiTop10] = useState([]);
  const [sprintQualiPole, setSprintQualiPole] = useState(null);
  const [sprintQualiTop10, setSprintQualiTop10] = useState([]);
  const [sprintRaceWinner, setSprintRaceWinner] = useState(null);
  const [sprintRaceTop10, setSprintRaceTop10] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop10, setRaceTop10] = useState([]);

  // Bonus results
  const [safetyCar, setSafetyCar] = useState(false);
  const [dnfDrivers, setDnfDrivers] = useState([]);
  const [fastestLap, setFastestLap] = useState(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState(null);

  const [selectionMode, setSelectionMode] = useState("quali_pole");

  const resetForm = () => {
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

  const selectRace = async (race) => {
    setSelectedRace(race);
    resetForm();

    if (race.has_results) {
      try {
        const res = await apiClient.get(`/admin/results/${race.id}`);
        if (res.data?.results) {
          const r = res.data.results;
          setQualiPole(r.quali_pole);
          setQualiTop10(r.quali_top10 || []);
          setSprintQualiPole(r.sprint_quali_pole || null);
          setSprintQualiTop10(r.sprint_quali_top10 || []);
          setSprintRaceWinner(r.sprint_race_winner || null);
          setSprintRaceTop10(r.sprint_race_top10 || []);
          setRaceWinner(r.race_winner);
          setRaceTop10(r.race_top10 || []);
          setSafetyCar(r.bonus?.safety_car || false);
          setDnfDrivers(r.bonus?.dnf_drivers || []);
          setFastestLap(r.bonus?.fastest_lap || null);
          setFirstCornerLeader(r.bonus?.first_corner_leader || null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId); break;
      case "quali_top10":
        if (qualiTop10.includes(driverId)) setQualiTop10(qualiTop10.filter(d => d !== driverId));
        else if (qualiTop10.length < 10) setQualiTop10([...qualiTop10, driverId]);
        break;
      case "sprint_quali_pole":
        setSprintQualiPole(driverId); break;
      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId)) setSprintQualiTop10(sprintQualiTop10.filter(d => d !== driverId));
        else if (sprintQualiTop10.length < 10) setSprintQualiTop10([...sprintQualiTop10, driverId]);
        break;
      case "sprint_race_winner":
        setSprintRaceWinner(driverId); break;
      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId)) setSprintRaceTop10(sprintRaceTop10.filter(d => d !== driverId));
        else if (sprintRaceTop10.length < 10) setSprintRaceTop10([...sprintRaceTop10, driverId]);
        break;
      case "race_winner":
        setRaceWinner(driverId); break;
      case "race_top10":
        if (raceTop10.includes(driverId)) setRaceTop10(raceTop10.filter(d => d !== driverId));
        else if (raceTop10.length < 10) setRaceTop10([...raceTop10, driverId]);
        break;
      case "fastest_lap":
        setFastestLap(driverId === fastestLap ? null : driverId); break;
      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId); break;
      case "dnf_select":
        if (dnfDrivers.includes(driverId)) setDnfDrivers(dnfDrivers.filter(d => d !== driverId));
        else setDnfDrivers([...dnfDrivers, driverId]);
        break;
      default: break;
    }
  };

  const isDriverSelected = (driverId) => {
    switch (selectionMode) {
      case "quali_pole": return qualiPole === driverId;
      case "quali_top10": return qualiTop10.includes(driverId);
      case "sprint_quali_pole": return sprintQualiPole === driverId;
      case "sprint_quali_top10": return sprintQualiTop10.includes(driverId);
      case "sprint_race_winner": return sprintRaceWinner === driverId;
      case "sprint_race_top10": return sprintRaceTop10.includes(driverId);
      case "race_winner": return raceWinner === driverId;
      case "race_top10": return raceTop10.includes(driverId);
      case "fastest_lap": return fastestLap === driverId;
      case "first_corner": return firstCornerLeader === driverId;
      case "dnf_select": return dnfDrivers.includes(driverId);
      default: return false;
    }
  };

  const getDriverPosition = (driverId) => {
    if (selectionMode === "quali_top10") return qualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_quali_top10") return sprintQualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_race_top10") return sprintRaceTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "race_top10") return raceTop10.indexOf(driverId) + 1 || null;
    return null;
  };

  const isSprintComplete = !selectedRace?.is_sprint || (
    sprintQualiPole && sprintQualiTop10.length === 10 &&
    sprintRaceWinner && sprintRaceTop10.length === 10
  );
  const isComplete = qualiPole && qualiTop10.length === 10 && raceWinner && raceTop10.length === 10 && isSprintComplete;

  const handleSubmit = async () => {
    if (!isComplete) { toast.error("Complete tous les resultats obligatoires"); return; }
    setSaving(true);
    try {
      const payload = {
        quali_pole: qualiPole, quali_top10: qualiTop10,
        race_winner: raceWinner, race_top10: raceTop10,
        safety_car: safetyCar, dnf_drivers: dnfDrivers,
        fastest_lap: fastestLap, first_corner_leader: firstCornerLeader,
      };
      if (selectedRace.is_sprint) {
        payload.sprint_quali_pole = sprintQualiPole;
        payload.sprint_quali_top10 = sprintQualiTop10;
        payload.sprint_race_winner = sprintRaceWinner;
        payload.sprint_race_top10 = sprintRaceTop10;
      }
      await apiClient.post(`/admin/results/${selectedRace.id}`, payload);
      toast.success("Resultats enregistres ! Les points ont ete calcules.");
      const racesRes = await apiClient.get("/admin/races");
      setRaces(racesRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  };

  const handleSyncOpenF1 = async () => {
    if (!selectedRace) return;
    setSyncing(true);
    try {
      const res = await apiClient.post(`/admin/sync-results/${selectedRace.id}`);
      if (res.data.status === "success" || res.data.status === "partial") {
        const f = res.data.fetched_data;
        if (f.quali_pole) setQualiPole(f.quali_pole);
        if (f.quali_top10?.length) setQualiTop10(f.quali_top10);
        if (f.sprint_quali_pole) setSprintQualiPole(f.sprint_quali_pole);
        if (f.sprint_quali_top10?.length) setSprintQualiTop10(f.sprint_quali_top10);
        if (f.sprint_race_winner) setSprintRaceWinner(f.sprint_race_winner);
        if (f.sprint_race_top10?.length) setSprintRaceTop10(f.sprint_race_top10);
        if (f.race_winner) setRaceWinner(f.race_winner);
        if (f.race_top10?.length) setRaceTop10(f.race_top10);
        if (f.bonus) {
          if (f.bonus.safety_car !== null && f.bonus.safety_car !== undefined) setSafetyCar(f.bonus.safety_car);
          if (f.bonus.dnf_drivers?.length) setDnfDrivers(f.bonus.dnf_drivers);
          if (f.bonus.fastest_lap) setFastestLap(f.bonus.fastest_lap);
          if (f.bonus.first_corner_leader) setFirstCornerLeader(f.bonus.first_corner_leader);
        }
        const items = res.data.success_items || [];
        if (items.length > 0) toast.success(`Donnees recuperees automatiquement !\n${items.join(', ')}`, { duration: 5000 });
        else toast.warning("Aucune donnee disponible via l'API. Saisie manuelle requise.");
        if (res.data.errors?.length > 0) console.log("Sync errors:", res.data.errors);
      } else {
        toast.warning(res.data.message || "Donnees non disponibles, saisie manuelle requise.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erreur lors de la synchronisation avec les APIs");
    } finally { setSyncing(false); }
  };

  return {
    selectedRace, selectRace, saving, syncing, selectionMode, setSelectionMode,
    qualiPole, qualiTop10, sprintQualiPole, sprintQualiTop10,
    sprintRaceWinner, sprintRaceTop10, raceWinner, raceTop10,
    safetyCar, setSafetyCar, dnfDrivers, setDnfDrivers,
    fastestLap, firstCornerLeader,
    handleDriverSelect, isDriverSelected, getDriverPosition,
    isComplete, handleSubmit, handleSyncOpenF1,
  };
}
