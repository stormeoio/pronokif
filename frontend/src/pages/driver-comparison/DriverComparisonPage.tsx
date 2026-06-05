/**
 * DriverComparisonPage — Side-by-side driver stat comparison.
 * Broadcast Premium: glass header, pk-surface cards, team-color bars.
 */
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
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
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import type { Driver } from "@/types/api";

/* ── Skeleton ─────────────────────────────────────────── */

function ComparisonSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-pk-red animate-spin" />
    </div>
  );
}

/* ── Driver Selector ──────────────────────────────────── */

interface DriverSelectorProps {
  drivers: Driver[];
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-pk-surface border border-white/[0.08] rounded-lg flex items-center justify-between hover:border-white/[0.15] transition-colors"
        data-testid={testId}
      >
        <div className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                style={{
                  borderWidth: "2px",
                  borderStyle: "solid",
                  borderColor: getTeamColor(selected.team_id),
                }}
              >
                <img
                  src={selected.photo_url}
                  alt={selected.full_name || selected.last_name || ""}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="font-display text-xs truncate">
                {selected.last_name?.toUpperCase()}
              </span>
            </>
          ) : (
            <span className="text-pk-titane text-xs">Pilote</span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-pk-titane" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-50 mt-1 w-full bg-pk-surface border border-white/[0.08] rounded-lg shadow-xl max-h-64 overflow-y-auto scrollbar-none"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {drivers
              .filter((d) => d.id !== excludeId)
              .map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => onSelect(driver.id)}
                  className={`w-full p-2 flex items-center gap-2 hover:bg-white/[0.04] transition-colors ${driver.id === selectedId ? "bg-pk-red-subtle" : ""}`}
                >
                  <div
                    className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                    style={{
                      borderWidth: "2px",
                      borderStyle: "solid",
                      borderColor: getTeamColor(driver.team_id),
                    }}
                  >
                    <img
                      src={driver.photo_url}
                      alt={`${driver.first_name} ${driver.last_name}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-display text-xs truncate">
                      {driver.first_name} {driver.last_name}
                    </p>
                    <p className="font-data text-[0.5rem] text-pk-titane">{driver.team}</p>
                  </div>
                  {driver.id === selectedId && <Check className="w-3.5 h-3.5 text-pk-red" />}
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function DriverComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);
  const [driver1Id, setDriver1Id] = useState(searchParams.get("d1") || "");
  const [driver2Id, setDriver2Id] = useState(searchParams.get("d2") || "");
  const [dropdown1Open, setDropdown1Open] = useState(false);
  const [dropdown2Open, setDropdown2Open] = useState(false);

  const driversQuery = useAllDrivers();
  const allDrivers = driversQuery.data ?? [];
  const loadingDrivers = driversQuery.isLoading;

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

  if (loadingDrivers) return <ComparisonSkeleton />;

  const d1 = comparison?.driver1;
  const d2 = comparison?.driver2;
  const stats = comparison?.stats_comparison;

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="comparison-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/championship")}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="comparison-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-pk-info" /> Comparateur
              </h1>
              <p className="font-data text-[0.5625rem] text-pk-titane">
                Compare les stats de 2 pilotes
              </p>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="max-w-2xl mx-auto px-4 pt-4 space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Driver Selectors */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
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
        </motion.div>

        {/* Swap button */}
        <motion.div variants={fadeUp} className="flex justify-center">
          <button
            onClick={swapDrivers}
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-full font-data text-[0.5625rem] text-pk-titane hover:text-pk-piste hover:border-pk-info/30 transition-colors flex items-center gap-1.5"
            data-testid="comparison-swap"
          >
            <GitCompare className="w-3.5 h-3.5" /> Inverser
          </button>
        </motion.div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-pk-red animate-spin" />
          </div>
        ) : comparison && d1 && d2 ? (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            key={`${driver1Id}-${driver2Id}`}
          >
            {/* Driver Cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
              <DriverCard driver={d1} />
              <DriverCard driver={d2} />
            </motion.div>

            {/* F1 Stats */}
            <motion.div
              variants={fadeUp}
              className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            >
              <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-pk-gold" /> Stats F1
              </h3>
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
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
                  label="Points en carrière"
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

            {/* Efficiency */}
            <motion.div
              variants={fadeUp}
              className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            >
              <h3 className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-pk-emerald" /> Efficacité
              </h3>
              <div className="grid grid-cols-2 gap-2">
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
                  label="Points/race"
                  value1={comparison.points_per_race?.driver1 || 0}
                  value2={comparison.points_per_race?.driver2 || 0}
                  driver1={d1}
                  driver2={d2}
                  suffix=""
                />
              </div>
            </motion.div>

            {/* Verdict */}
            <motion.div
              variants={fadeUp}
              className="bg-pk-info/[0.06] border border-pk-info/20 rounded-lg p-4"
            >
              <h3 className="font-display text-sm mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-pk-info" /> Verdict rapide
              </h3>
              <p className="text-xs text-pk-piste/80 leading-relaxed">
                {getVerdict(comparison, d1, d2)}
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            className="bg-pk-surface border border-white/[0.08] rounded-lg p-8 text-center"
          >
            <GitCompare className="w-10 h-10 text-pk-titane mx-auto mb-3" />
            <p className="text-sm text-pk-titane">
              Sélectionne deux pilotes différents pour les comparer
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
