import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Flag, Trophy, RefreshCw, Loader2, Car, Calendar, GitCompare } from "lucide-react";
import { Button } from "../../components/ui/button";
import DriverStandings from "./DriverStandings";
import ConstructorStandings from "./ConstructorStandings";
import SeasonProgress from "./SeasonProgress";
import { useChampionshipData } from "./useChampionshipData";
import { haptic } from "@/lib/haptics";

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("drivers");

  const {
    loading,
    refreshing,
    season,
    driversStandings,
    constructorsStandings,
    raceSchedule,
    refetchAll,
    lastUpdated,
  } = useChampionshipData();

  const handleRefresh = async () => {
    haptic("selection");
    await refetchAll();
    toast.success("Classements mis à jour !");
  };

  const handleTabChange = (key: string) => {
    haptic("light");
    setActiveTab(key);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring" }}
        >
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-400">Chargement des classements F1...</p>
        </motion.div>
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
              <motion.div
                className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center"
                whileHover={{ rotate: 5, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Flag className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="font-heading text-lg uppercase tracking-tight text-white">
                  Championnat F1
                </h1>
                <p className="font-body text-xs text-gray-400">Saison {season}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
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
          </div>

          {lastUpdated && (
            <p className="font-body text-[10px] text-gray-500 mt-2">
              Dernière mise à jour: {lastUpdated.toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </div>

      {/* Main Tab Toggle + Content */}
      <motion.div
        className="max-w-2xl mx-auto px-4 pt-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl mb-4 backdrop-blur-sm">
          {tabs.map(({ key, label, icon: Icon, gradient }) => (
            <motion.button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 relative ${
                activeTab === key
                  ? "text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              data-testid={`tab-${key}`}
              whileTap={{ scale: 0.95 }}
            >
              {activeTab === key && (
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-r ${gradient} rounded-lg`}
                  layoutId="championshipTab"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "drivers" && <DriverStandings driversStandings={driversStandings} />}
            {activeTab === "constructors" && (
              <ConstructorStandings constructorsStandings={constructorsStandings} />
            )}
            {activeTab === "results" && <SeasonProgress raceSchedule={raceSchedule} />}
          </motion.div>
        </AnimatePresence>

        {/* API Attribution */}
        <motion.div
          className="mt-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="font-body text-[10px] text-gray-600">
            Données fournies par Jolpica F1 API & OpenF1
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
