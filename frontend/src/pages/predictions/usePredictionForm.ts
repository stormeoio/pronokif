/**
 * Form state management for the predictions page.
 *
 * Encapsulates all sprint + main race prediction state,
 * hydration from existing prediction, completion checks,
 * and save/delete handlers.
 */
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import type { RaceDetails, Prediction } from "@/types/api";

interface UsePredictionFormParams {
  raceId: string | undefined;
  race: RaceDetails | null;
  loading: boolean;
  fetchedPrediction: Prediction | null;
}

export function usePredictionForm({
  raceId,
  race,
  loading,
  fetchedPrediction,
}: UsePredictionFormParams) {
  const [saving, setSaving] = useState(false);
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(
    null,
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationXp, setCelebrationXp] = useState(0);

  // Tab for sprint weekends
  const [activeTab, setActiveTab] = useState("sprint");

  // Sprint predictions
  const [sprintQualiPole, setSprintQualiPole] = useState<string | null>(null);
  const [sprintQualiTop10, setSprintQualiTop10] = useState<string[]>([]);
  const [sprintRaceWinner, setSprintRaceWinner] = useState<string | null>(null);
  const [sprintRaceTop10, setSprintRaceTop10] = useState<string[]>([]);
  const [sprintSafetyCar, setSprintSafetyCar] = useState<boolean | null>(null);
  const [sprintDnfDrivers, setSprintDnfDrivers] = useState<string[]>([]);
  const [sprintNoDnf, setSprintNoDnf] = useState(false);
  const [sprintFastestLap, setSprintFastestLap] = useState<string | null>(null);
  const [sprintFirstCorner, setSprintFirstCorner] = useState<string | null>(null);

  // Main race predictions
  const [qualiPole, setQualiPole] = useState<string | null>(null);
  const [qualiTop10, setQualiTop10] = useState<string[]>([]);
  const [raceWinner, setRaceWinner] = useState<string | null>(null);
  const [raceTop10, setRaceTop10] = useState<string[]>([]);
  const [safetyCar, setSafetyCar] = useState<boolean | null>(null);
  const [dnfDrivers, setDnfDrivers] = useState<string[]>([]);
  const [noDnf, setNoDnf] = useState(false);
  const [fastestLapDriver, setFastestLapDriver] = useState<string | null>(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState<string | null>(null);

  // Selection mode
  const [selectionMode, setSelectionMode] = useState("quali_pole");

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Hydrate from fetched prediction ────────────────────────────────
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (loading || hydratedRef.current) return;
    hydratedRef.current = true;

    if (fetchedPrediction) {
      setExistingPrediction(fetchedPrediction);
      // Cast to Record for field access — actual API response has extra fields not in Prediction type
      const pred = fetchedPrediction as unknown as Record<string, unknown>;
      setQualiPole((pred.quali_pole as string) || null);
      setQualiTop10((pred.quali_top10 as string[]) || []);
      setRaceWinner((pred.race_winner as string) || null);
      setRaceTop10((pred.race_top10 as string[]) || []);
      const bonus = pred.bonus_bets as Record<string, unknown> | undefined;
      if (bonus) {
        setSafetyCar((bonus.safety_car as boolean) ?? null);
        setDnfDrivers((bonus.dnf_drivers as string[]) || []);
        setNoDnf((bonus.no_dnf as boolean) || false);
        setFastestLapDriver((bonus.fastest_lap_driver as string) || null);
        setFirstCornerLeader((bonus.first_corner_leader as string) || null);
      }
      setSprintQualiPole((pred.sprint_quali_pole as string) || null);
      setSprintQualiTop10((pred.sprint_quali_top10 as string[]) || []);
      setSprintRaceWinner((pred.sprint_race_winner as string) || null);
      setSprintRaceTop10((pred.sprint_race_top10 as string[]) || []);
      const sprintBonus = pred.sprint_bonus_bets as
        | Record<string, unknown>
        | undefined;
      if (sprintBonus) {
        setSprintSafetyCar((sprintBonus.safety_car as boolean) ?? null);
        setSprintDnfDrivers((sprintBonus.dnf_drivers as string[]) || []);
        setSprintNoDnf((sprintBonus.no_dnf as boolean) || false);
        setSprintFastestLap((sprintBonus.fastest_lap_driver as string) || null);
        setSprintFirstCorner((sprintBonus.first_corner_leader as string) || null);
      }
    }

    if (race?.is_sprint_weekend) {
      setActiveTab("sprint");
      setSelectionMode("sprint_quali_pole");
    } else {
      setActiveTab("main");
      setSelectionMode("quali_pole");
    }
  }, [loading, fetchedPrediction, race]);

  useEffect(() => {
    setSelectionMode(activeTab === "sprint" ? "sprint_quali_pole" : "quali_pole");
  }, [activeTab]);

  // ── Completion checks ──────────────────────────────────────────────
  const isSprintComplete = !!(
    sprintQualiPole &&
    sprintQualiTop10.length === 10 &&
    sprintRaceWinner &&
    sprintRaceTop10.length === 10
  );
  const isMainComplete = !!(
    qualiPole &&
    qualiTop10.length === 10 &&
    raceWinner &&
    raceTop10.length === 10
  );
  const isSprintBonusComplete = !!(
    sprintSafetyCar !== null &&
    sprintFastestLap &&
    sprintFirstCorner &&
    (sprintNoDnf || sprintDnfDrivers.length > 0)
  );
  const isMainBonusComplete = !!(
    safetyCar !== null &&
    fastestLapDriver &&
    firstCornerLeader &&
    (noDnf || dnfDrivers.length > 0)
  );

  // ── Delete handler ─────────────────────────────────────────────────
  const handleDeletePredictions = async () => {
    setDeleting(true);
    try {
      await api.predictions.delete(raceId!);
      toast.success("Pronostics supprimés !");
      setExistingPrediction(null);
      setQualiPole(null);
      setQualiTop10([]);
      setRaceWinner(null);
      setRaceTop10([]);
      setSafetyCar(null);
      setDnfDrivers([]);
      setNoDnf(false);
      setFastestLapDriver(null);
      setFirstCornerLeader(null);
      setSprintQualiPole(null);
      setSprintQualiTop10([]);
      setSprintRaceWinner(null);
      setSprintRaceTop10([]);
      setSprintSafetyCar(null);
      setSprintDnfDrivers([]);
      setSprintNoDnf(false);
      setSprintFastestLap(null);
      setSprintFirstCorner(null);
      setSelectionMode(
        race?.is_sprint_weekend ? "sprint_quali_pole" : "quali_pole",
      );
      setShowDeleteConfirm(false);
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  };

  // ── Save handler ───────────────────────────────────────────────────
  const handleSave = async () => {
    const isSprint = activeTab === "sprint";
    const complete = isSprint ? isSprintComplete : isMainComplete;
    if (!complete) {
      toast.error(
        isSprint ? "Complete tous les pronostics sprint" : "Complete tous les pronostics course",
      );
      return;
    }
    setSaving(true);
    try {
      if (isSprint) {
        await api.predictions.saveSprint({
          race_id: raceId,
          sprint_quali_pole: sprintQualiPole,
          sprint_quali_top10: sprintQualiTop10,
          sprint_race_winner: sprintRaceWinner,
          sprint_race_top10: sprintRaceTop10,
          sprint_bonus_bets: {
            safety_car: sprintSafetyCar,
            dnf_drivers: sprintNoDnf ? [] : sprintDnfDrivers,
            no_dnf: sprintNoDnf,
            fastest_lap_driver: sprintFastestLap,
            first_corner_leader: sprintFirstCorner,
          },
        });
        setCelebrationXp(25);
        setShowCelebration(true);
        haptic("success");
      } else {
        await api.predictions.saveMain({
          race_id: raceId,
          quali_pole: qualiPole,
          quali_top10: qualiTop10,
          race_winner: raceWinner,
          race_top10: raceTop10,
          bonus_bets: {
            safety_car: safetyCar,
            dnf_drivers: noDnf ? [] : dnfDrivers,
            no_dnf: noDnf,
            fastest_lap_driver: fastestLapDriver,
            first_corner_leader: firstCornerLeader,
          },
        });
        setCelebrationXp(50);
        setShowCelebration(true);
        haptic("success");
      }
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const dismissCelebration = () => setShowCelebration(false);

  return {
    // State
    activeTab,
    setActiveTab,
    selectionMode,
    setSelectionMode,
    existingPrediction,
    saving,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deleting,
    // Sprint state
    sprintQualiPole,
    setSprintQualiPole,
    sprintQualiTop10,
    setSprintQualiTop10,
    sprintRaceWinner,
    setSprintRaceWinner,
    sprintRaceTop10,
    setSprintRaceTop10,
    sprintSafetyCar,
    setSprintSafetyCar,
    sprintDnfDrivers,
    setSprintDnfDrivers,
    sprintNoDnf,
    setSprintNoDnf,
    sprintFastestLap,
    setSprintFastestLap,
    sprintFirstCorner,
    setSprintFirstCorner,
    // Main state
    qualiPole,
    setQualiPole,
    qualiTop10,
    setQualiTop10,
    raceWinner,
    setRaceWinner,
    raceTop10,
    setRaceTop10,
    safetyCar,
    setSafetyCar,
    dnfDrivers,
    setDnfDrivers,
    noDnf,
    setNoDnf,
    fastestLapDriver,
    setFastestLapDriver,
    firstCornerLeader,
    setFirstCornerLeader,
    // Completion
    isSprintComplete,
    isMainComplete,
    isSprintBonusComplete,
    isMainBonusComplete,
    // Actions
    handleSave,
    handleDeletePredictions,
    // Celebration
    showCelebration,
    celebrationXp,
    dismissCelebration,
  };
}
