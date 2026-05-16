import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import {
  Flag, Trophy, RefreshCw, Loader2, Car, Calendar, GitCompare,
} from "lucide-react";
import { JOLPICA_API } from "./championshipUtils";
import DriverStandings from "./DriverStandings";
import ConstructorStandings from "./ConstructorStandings";
import SeasonProgress from "./SeasonProgress";

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("drivers");
  const [driversStandings, setDriversStandings] = useState([]);
  const [constructorsStandings, setConstructorsStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [season, setSeason] = useState(new Date().getFullYear());
  const [raceSchedule, setRaceSchedule] = useState([]);

  const fetchStandings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [driversRes, constructorsRes, scheduleRes] = await Promise.all([
        fetch(`${JOLPICA_API}/current/driverstandings.json`),
        fetch(`${JOLPICA_API}/current/constructorstandings.json`),
        fetch(`${JOLPICA_API}/current.json`),
      ]);

      if (!driversRes.ok || !constructorsRes.ok) throw new Error("API error");

      const driversData = await driversRes.json();
      const constructorsData = await constructorsRes.json();
      const scheduleData = await scheduleRes.json();

      const driversList = driversData?.MRData?.StandingsTable?.StandingsLists?.[0];
      if (driversList) {
        setSeason(driversList.season);
        setDriversStandings(driversList.DriverStandings || []);
      }

      const constructorsList = constructorsData?.MRData?.StandingsTable?.StandingsLists?.[0];
      if (constructorsList) {
        setConstructorsStandings(constructorsList.ConstructorStandings || []);
      }

      setRaceSchedule(scheduleData?.MRData?.RaceTable?.Races || []);
      setLastUpdated(new Date());
      if (isRefresh) toast.success("Classements mis à jour !");
    } catch (e) {
      console.error("Error fetching F1 standings:", e);
      toast.error("Erreur lors du chargement des classements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-400">Chargement des classements F1...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "drivers", label: "Pilotes", icon: Trophy, gradient: "from-red-500 to-red-600" },
    { key: "constructors", label: "Écuries", icon: Car, gradient: "from-blue-500 to-blue-600" },
    { key: "results", label: "Résultats", icon: Calendar, gradient: "from-green-500 to-green-600" },
  ];

  return (
    <div className="min-h-screen bg-app-main pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-red-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-lg uppercase tracking-tight text-white">
                  Championnat F1
                </h1>
                <p className="font-body text-xs text-gray-400">Saison {season}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchStandings(true)}
              disabled={refreshing}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/compare")}
              className="text-cyan-400 hover:text-white hover:bg-cyan-500/20"
              title="Comparer des pilotes"
            >
              <GitCompare className="w-5 h-5" />
            </Button>
          </div>

          {lastUpdated && (
            <p className="font-body text-[10px] text-gray-500 mt-2">
              Dernière mise à jour: {lastUpdated.toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </div>

      {/* Main Tab Toggle + Content */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg mb-4">
          {tabs.map(({ key, label, icon: Icon, gradient }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === key
                  ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "drivers" && <DriverStandings driversStandings={driversStandings} />}
        {activeTab === "constructors" && <ConstructorStandings constructorsStandings={constructorsStandings} />}
        {activeTab === "results" && <SeasonProgress raceSchedule={raceSchedule} />}

        {/* API Attribution */}
        <div className="mt-6 text-center">
          <p className="font-body text-[10px] text-gray-600">
            Données fournies par Jolpica F1 API & OpenF1
          </p>
        </div>
      </div>
    </div>
  );
}
