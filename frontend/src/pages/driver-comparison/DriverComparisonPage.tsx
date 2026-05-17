import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Zap,
  Flag,
  Timer,
  Target,
  Hash,
  ChevronDown,
  Check,
  Loader2,
  GitCompare,
  Crown,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  getTeamColor,
  DriverCard,
  ComparisonBar,
  EfficiencyCard,
  getVerdict,
} from "./ComparisonComponents";
import { useAllDrivers, useDriverComparison } from "./useDriverComparisonData";
import { haptic } from "@/lib/haptics";

export default function DriverComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [driver1Id, setDriver1Id] = useState(searchParams.get("d1") || "");
  const [driver2Id, setDriver2Id] = useState(searchParams.get("d2") || "");
  const [dropdown1Open, setDropdown1Open] = useState(false);
  const [dropdown2Open, setDropdown2Open] = useState(false);

  const driversQuery = useAllDrivers();
  const allDrivers = driversQuery.data ?? [];
  const loadingDrivers = driversQuery.isLoading;

  // Set default selections once drivers load
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || allDrivers.length === 0) return;
    hydratedRef.current = true;
    if (!driver1Id && allDrivers.length > 0) setDriver1Id(allDrivers[0].id);
    if (!driver2Id && allDrivers.length > 1) setDriver2Id(allDrivers[1].id);
  }, [allDrivers, driver1Id, driver2Id]);

  const comparisonQuery = useDriverComparison(driver1Id, driver2Id);
  const comparison = comparisonQuery.data ?? null;
  const loading = comparisonQuery.isLoading;

  const swapDrivers = () => {
    haptic("selection");
    const t = driver1Id;
    setDriver1Id(driver2Id);
    setDriver2Id(t);
  };

  if (loadingDrivers) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const d1 = comparison?.driver1;
  const d2 = comparison?.driver2;
  const stats = comparison?.stats_comparison;

  return (
    <div className="min-h-screen bg-app-main pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-cyan-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/championship")}
              className="p-2 bg-gray-800/50 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              aria-label="Retour au championnat"
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-heading text-lg uppercase tracking-tight text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-cyan-400" /> Comparateur
              </h1>
              <p className="font-body text-xs text-gray-400">
                Comparez les statistiques de 2 pilotes
              </p>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto px-4 py-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Driver Selectors */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <DriverSelector
            drivers={allDrivers}
            excludeId={driver2Id}
            selectedId={driver1Id}
            onSelect={(id) => {
              setDriver1Id(id);
              setDropdown1Open(false);
            }}
            isOpen={dropdown1Open}
            setIsOpen={(v) => {
              setDropdown1Open(v);
              setDropdown2Open(false);
            }}
            testId="driver1-selector"
          />
          <DriverSelector
            drivers={allDrivers}
            excludeId={driver1Id}
            selectedId={driver2Id}
            onSelect={(id) => {
              setDriver2Id(id);
              setDropdown2Open(false);
            }}
            isOpen={dropdown2Open}
            setIsOpen={(v) => {
              setDropdown2Open(v);
              setDropdown1Open(false);
            }}
            testId="driver2-selector"
          />
        </div>

        <div className="flex justify-center mb-6">
          <motion.button
            onClick={swapDrivers}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full font-body text-xs text-gray-400 hover:text-white hover:border-cyan-500/50 transition-colors flex items-center gap-2"
            whileTap={{ scale: 0.9, rotate: 180 }}
            whileHover={{ scale: 1.05 }}
          >
            <GitCompare className="w-4 h-4" /> Inverser
          </motion.button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : comparison && d1 && d2 ? (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } }, hidden: {} }}
            key={`${driver1Id}-${driver2Id}`}
          >
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={{
                hidden: { opacity: 0, scale: 0.95 },
                visible: { opacity: 1, scale: 1 },
              }}
            >
              <DriverCard driver={d1} />
              <DriverCard driver={d2} />
            </motion.div>

            <motion.div
              className="card-arcade p-4 glass-card"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> Statistiques F1
              </h3>
              <motion.div
                className="space-y-4"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
              >
                <ComparisonBar
                  label="Titres mondiaux"
                  icon={Crown}
                  value1={stats?.world_championships?.driver1 || 0}
                  value2={stats?.world_championships?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
                <ComparisonBar
                  label="Victoires"
                  icon={Flag}
                  value1={stats?.wins?.driver1 || 0}
                  value2={stats?.wins?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
                <ComparisonBar
                  label="Podiums"
                  icon={Medal}
                  value1={stats?.podiums?.driver1 || 0}
                  value2={stats?.podiums?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
                <ComparisonBar
                  label="Poles"
                  icon={Zap}
                  value1={stats?.poles?.driver1 || 0}
                  value2={stats?.poles?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
                <ComparisonBar
                  label="Meilleurs tours"
                  icon={Timer}
                  value1={stats?.fastest_laps?.driver1 || 0}
                  value2={stats?.fastest_laps?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
                <ComparisonBar
                  label="Points en carriere"
                  icon={Hash}
                  value1={stats?.points?.driver1 || 0}
                  value2={stats?.points?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
                <ComparisonBar
                  label="Grands Prix"
                  icon={Target}
                  value1={stats?.entries?.driver1 || 0}
                  value2={stats?.entries?.driver2 || 0}
                  color1={getTeamColor(d1.team_id)}
                  color2={getTeamColor(d2.team_id)}
                />
              </motion.div>
            </motion.div>

            <motion.div
              className="card-arcade p-4 glass-card"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" /> Efficacite
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <EfficiencyCard
                  label="Taux de victoire"
                  value1={comparison.win_rate?.driver1 || 0}
                  value2={comparison.win_rate?.driver2 || 0}
                  driver1={d1}
                  driver2={d2}
                  suffix="%"
                />
                <EfficiencyCard
                  label="Taux de podium"
                  value1={comparison.podium_rate?.driver1 || 0}
                  value2={comparison.podium_rate?.driver2 || 0}
                  driver1={d1}
                  driver2={d2}
                  suffix="%"
                />
                <EfficiencyCard
                  label="Taux de pole"
                  value1={comparison.pole_rate?.driver1 || 0}
                  value2={comparison.pole_rate?.driver2 || 0}
                  driver1={d1}
                  driver2={d2}
                  suffix="%"
                />
                <EfficiencyCard
                  label="Points/course"
                  value1={comparison.points_per_race?.driver1 || 0}
                  value2={comparison.points_per_race?.driver2 || 0}
                  driver1={d1}
                  driver2={d2}
                  suffix=""
                />
              </div>
            </motion.div>

            <motion.div
              className="card-arcade p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30 glass-card"
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.97 },
                visible: { opacity: 1, y: 0, scale: 1 },
              }}
            >
              <h3 className="font-heading text-sm text-white mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" /> Verdict rapide
              </h3>
              <p className="font-body text-sm text-gray-300">{getVerdict(comparison, d1, d2)}</p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            className="card-arcade p-8 text-center glass-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <GitCompare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-body text-gray-400">
              Selectionnez deux pilotes differents pour les comparer
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

interface DriverSelectorProps {
  drivers: Record<string, any>[];
  excludeId: string;
  selectedId: string;
  onSelect: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  testId: string;
}

function DriverSelector({
  drivers,
  excludeId,
  selectedId,
  onSelect,
  isOpen,
  setIsOpen,
  testId,
}: DriverSelectorProps) {
  const selected = drivers.find((d) => d.id === selectedId);
  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-xl flex items-center justify-between hover:border-cyan-500/50 transition-colors"
        data-testid={testId}
        whileTap={{ scale: 0.97 }}
      >
        <div className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <div
                className="w-8 h-8 rounded-full overflow-hidden border-2"
                style={{ borderColor: getTeamColor(selected.team_id) }}
              >
                <img src={selected.photo_url} alt={selected.full_name || selected.last_name || "Photo du pilote"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </div>
              <span className="font-heading text-sm text-white truncate">
                {selected.last_name?.toUpperCase()}
              </span>
            </>
          ) : (
            <span className="text-gray-500">Pilote</span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-64 overflow-y-auto"
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {drivers
              .filter((d) => d.id !== excludeId)
              .map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => onSelect(driver.id)}
                  className={`w-full p-2 flex items-center gap-2 hover:bg-gray-800 transition-colors ${driver.id === selectedId ? "bg-cyan-500/20" : ""}`}
                >
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden border-2"
                    style={{ borderColor: getTeamColor(driver.team_id) }}
                  >
                    <img src={driver.photo_url} alt={`${driver.first_name} ${driver.last_name}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-heading text-xs text-white">
                      {driver.first_name} {driver.last_name}
                    </p>
                    <p className="font-body text-[10px] text-gray-500">{driver.team}</p>
                  </div>
                  {driver.id === selectedId && <Check className="w-4 h-4 text-cyan-400" />}
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
