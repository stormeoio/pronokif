import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  ChevronLeft, ChevronRight, Trophy, Flag, Check, X,
  Calendar, MapPin, Clock
} from "lucide-react";

export default function ResultsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [races, setRaces] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [result, setResult] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [raceId]);

  const fetchData = async () => {
    try {
      const [racesRes, driversRes] = await Promise.all([
        apiClient.get("/races"),
        apiClient.get("/drivers")
      ]);

      setRaces(racesRes.data);
      setDrivers(driversRes.data);

      // Find selected or most recent finished race
      const finishedRaces = racesRes.data.filter(r => r.status === "finished");
      let targetRace = null;

      if (raceId) {
        targetRace = racesRes.data.find(r => r.id === raceId);
      } else if (finishedRaces.length > 0) {
        targetRace = finishedRaces[finishedRaces.length - 1];
      }

      if (targetRace) {
        setSelectedRace(targetRace);
        
        // Fetch results for this race
        try {
          const resultRes = await apiClient.get(`/results/${targetRace.id}`);
          setResult(resultRes.data);
        } catch {
          setResult(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectRace = async (race) => {
    setSelectedRace(race);
    navigate(`/results/${race.id}`, { replace: true });
    
    try {
      const resultRes = await apiClient.get(`/results/${race.id}`);
      setResult(resultRes.data);
    } catch {
      setResult(null);
    }
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || driverId;
  };

  const finishedRaces = races.filter(r => r.status === "finished");

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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-heading text-2xl uppercase tracking-tight italic text-white">
            Résultats
          </h1>
        </div>

        {/* Race Selector */}
        {finishedRaces.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {finishedRaces.map((race) => (
              <Button
                key={race.id}
                variant={selectedRace?.id === race.id ? "default" : "outline"}
                onClick={() => selectRace(race)}
                className={`flex-shrink-0 ${
                  selectedRace?.id === race.id 
                    ? 'bg-primary' 
                    : 'border-zinc-700 bg-zinc-900/50'
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
              <p className="font-heading text-xl uppercase text-zinc-400 mb-2">
                Aucun résultat disponible
              </p>
              <p className="font-body text-sm text-zinc-500">
                Les résultats seront disponibles après chaque course
              </p>
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
                      <MapPin className="w-4 h-4" />
                      {selectedRace.circuit}
                    </span>
                    <span className="flex items-center gap-1 text-sm font-body">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedRace.date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long' 
                      })}
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-emerald-500" />
                      <div>
                        <p className="font-heading text-lg uppercase text-white">
                          +{result.points.total} points
                        </p>
                        <p className="font-body text-sm text-emerald-400">
                          Gagnés sur ce Grand Prix
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Qualifications */}
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2">
                  <Flag className="w-5 h-5 text-primary" />
                  Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pole Position */}
                <div className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800">
                  <p className="font-body text-xs text-zinc-400 uppercase mb-2">Pole Position</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-heading text-white">
                        {getDriverName(result.results.quali_pole)}
                      </span>
                      <span className="font-body text-xs text-zinc-500">(Réel)</span>
                    </div>
                    {result.prediction && (
                      <div className="flex items-center gap-2">
                        <span className={`font-body text-sm ${
                          result.prediction.quali_pole === result.results.quali_pole 
                            ? 'text-emerald-500' 
                            : 'text-zinc-400'
                        }`}>
                          Ton choix: {getDriverName(result.prediction.quali_pole)}
                        </span>
                        {result.prediction.quali_pole === result.results.quali_pole ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top 3 Quali */}
                <div className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800">
                  <p className="font-body text-xs text-zinc-400 uppercase mb-2">Top 3</p>
                  <div className="space-y-2">
                    {result.results.quali_top3?.map((driverId, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-sm flex items-center justify-center font-heading text-xs ${
                            i === 0 ? 'bg-amber-500 text-black' :
                            i === 1 ? 'bg-zinc-300 text-black' :
                            'bg-amber-700 text-white'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-body text-white">{getDriverName(driverId)}</span>
                        </div>
                        {result.prediction && (
                          <div className="flex items-center gap-2">
                            <span className={`font-body text-sm ${
                              result.prediction.quali_top3[i] === driverId 
                                ? 'text-emerald-500' 
                                : result.prediction.quali_top3.includes(driverId)
                                  ? 'text-amber-500'
                                  : 'text-zinc-400'
                            }`}>
                              {getDriverName(result.prediction.quali_top3[i])}
                            </span>
                            {result.prediction.quali_top3[i] === driverId ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : result.prediction.quali_top3.includes(driverId) ? (
                              <span className="text-amber-500 text-xs">~</span>
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Course */}
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Course
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Winner */}
                <div className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800">
                  <p className="font-body text-xs text-zinc-400 uppercase mb-2">Vainqueur</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-heading text-white">
                        {getDriverName(result.results.race_winner)}
                      </span>
                      <span className="font-body text-xs text-zinc-500">(Réel)</span>
                    </div>
                    {result.prediction && (
                      <div className="flex items-center gap-2">
                        <span className={`font-body text-sm ${
                          result.prediction.race_winner === result.results.race_winner 
                            ? 'text-emerald-500' 
                            : 'text-zinc-400'
                        }`}>
                          Ton choix: {getDriverName(result.prediction.race_winner)}
                        </span>
                        {result.prediction.race_winner === result.results.race_winner ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top 3 Race */}
                <div className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800">
                  <p className="font-body text-xs text-zinc-400 uppercase mb-2">Top 3</p>
                  <div className="space-y-2">
                    {result.results.race_top3?.map((driverId, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-sm flex items-center justify-center font-heading text-xs ${
                            i === 0 ? 'bg-amber-500 text-black' :
                            i === 1 ? 'bg-zinc-300 text-black' :
                            'bg-amber-700 text-white'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-body text-white">{getDriverName(driverId)}</span>
                        </div>
                        {result.prediction && (
                          <div className="flex items-center gap-2">
                            <span className={`font-body text-sm ${
                              result.prediction.race_top3[i] === driverId 
                                ? 'text-emerald-500' 
                                : result.prediction.race_top3.includes(driverId)
                                  ? 'text-amber-500'
                                  : 'text-zinc-400'
                            }`}>
                              {getDriverName(result.prediction.race_top3[i])}
                            </span>
                            {result.prediction.race_top3[i] === driverId ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : result.prediction.race_top3.includes(driverId) ? (
                              <span className="text-amber-500 text-xs">~</span>
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Points Breakdown */}
            {result.points && result.points.details.length > 0 && (
              <Card className="bg-card border-white/10">
                <CardHeader>
                  <CardTitle className="font-heading text-lg uppercase tracking-tight">
                    Détail des points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.points.details.map((detail, i) => (
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
              <p className="font-heading text-lg uppercase text-zinc-400 mb-2">
                Résultats en attente
              </p>
              <p className="font-body text-sm text-zinc-500">
                Les résultats seront disponibles après la course
              </p>
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
