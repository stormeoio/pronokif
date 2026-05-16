import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  ChevronLeft, Trophy, Flag, Calendar, MapPin, Clock
} from "lucide-react";
import ResultComparisonCard from "./results/ResultComparisonCard";

export default function ResultsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [manualRaceId, setManualRaceId] = useState(null);

  const { data: races = [], isLoading: racesLoading } = useQuery({
    queryKey: ["/races"],
    queryFn: async () => (await apiClient.get("/races")).data,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["/drivers"],
    queryFn: async () => (await apiClient.get("/drivers")).data,
  });

  const selectedRace = useMemo(() => {
    const effectiveId = raceId || manualRaceId;
    if (effectiveId) return races.find((r: any) => r.id === effectiveId) || null;
    const finishedRaces = races.filter((r: any) => r.status === "finished");
    return finishedRaces.length > 0 ? finishedRaces[finishedRaces.length - 1] : null;
  }, [races, raceId, manualRaceId]);

  const { data: result = null } = useQuery({
    queryKey: ["/results", selectedRace?.id],
    queryFn: async () => (await apiClient.get(`/results/${selectedRace.id}`)).data,
    enabled: !!selectedRace?.id,
  });

  const loading = racesLoading || driversLoading;

  const selectRace = (race: any) => {
    setManualRaceId(race.id);
    navigate(`/results/${race.id}`, { replace: true });
  };

  const getDriverName = (driverId: any) => {
    const driver = drivers.find((d: any) => d.id === driverId);
    return driver?.name || driverId;
  };

  const finishedRaces = races.filter((r: any) => r.status === "finished");

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-48 skeleton rounded-md" />
          <div className="h-64 skeleton rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-6" data-testid="results-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-zinc-400 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-heading text-2xl uppercase tracking-tight italic text-white">
            Resultats
          </h1>
        </div>

        {/* Race Selector */}
        {finishedRaces.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {finishedRaces.map((race: any) => (
              <Button
                key={race.id}
                variant={selectedRace?.id === race.id ? "default" : "outline"}
                onClick={() => selectRace(race)}
                className={`flex-shrink-0 ${
                  selectedRace?.id === race.id ? "bg-primary" : "border-zinc-700 bg-zinc-900/50"
                }`}
                data-testid={`race-btn-${race.id}`}
              >
                {race.name.replace(" Grand Prix", "")}
              </Button>
            ))}
          </div>
        )}

        {/* No Results Yet */}
        {!selectedRace && (
          <Card className="bg-card border-white/10">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="font-heading text-xl uppercase text-zinc-400 mb-2">Aucun resultat disponible</p>
              <p className="font-body text-sm text-zinc-500">Les resultats seront disponibles apres chaque course</p>
            </CardContent>
          </Card>
        )}

        {/* Selected Race Info */}
        {selectedRace && (
          <Card className="bg-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-heading text-xl uppercase tracking-tight italic text-white">
                    {selectedRace.name}
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-zinc-400">
                    <span className="flex items-center gap-1 text-sm font-body">
                      <MapPin className="w-4 h-4" /> {selectedRace.circuit}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-body">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedRace.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                </div>
                <Flag className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Comparison */}
        {result && result.results && (
          <>
            {/* Points Summary */}
            {result.points && (
              <Card className="bg-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-emerald-500" />
                    <div>
                      <p className="font-heading text-lg uppercase text-white">+{result.points.total} points</p>
                      <p className="font-body text-sm text-emerald-400">Gagnes sur ce Grand Prix</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Qualifications */}
            <ResultComparisonCard
              title="Qualifications"
              icon={<Flag className="w-5 h-5 text-primary" />}
              winnerLabel="Pole Position"
              winnerId={result.results.quali_pole}
              predictionWinnerId={result.prediction?.quali_pole}
              top3={result.results.quali_top3}
              predictionTop3={result.prediction?.quali_top3}
              getDriverName={getDriverName}
            />

            {/* Course */}
            <ResultComparisonCard
              title="Course"
              icon={<Trophy className="w-5 h-5 text-amber-500" />}
              winnerLabel="Vainqueur"
              winnerId={result.results.race_winner}
              predictionWinnerId={result.prediction?.race_winner}
              top3={result.results.race_top3}
              predictionTop3={result.prediction?.race_top3}
              getDriverName={getDriverName}
            />

            {/* Points Breakdown */}
            {result.points && result.points.details.length > 0 && (
              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle className="font-heading text-lg uppercase tracking-tight">
                    Detail des points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.points.details.map((detail: any, i: any) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="font-body text-zinc-300">{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* No Results for selected race */}
        {selectedRace && !result?.results && (
          <Card className="bg-card border-white/10">
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="font-heading text-lg uppercase text-zinc-400 mb-2">Resultats en attente</p>
              <p className="font-body text-sm text-zinc-500">Les resultats seront disponibles apres la course</p>
            </CardContent>
          </Card>
        )}

        {/* No Prediction Warning */}
        {selectedRace && result?.results && !result.prediction && (
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="font-body text-amber-500 text-sm">
                Tu n'as pas fait de pronostics pour cette course
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
