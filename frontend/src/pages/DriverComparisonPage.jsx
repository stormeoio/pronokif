import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { toast } from "sonner";
import { 
  ArrowLeft, Trophy, Medal, Zap, Flag, Timer, Target, Hash,
  ChevronDown, Check, Loader2, GitCompare, Crown, Award,
  TrendingUp, Percent, Car
} from "lucide-react";

// Team colors
const teamColors = {
  "mclaren": "#FF8000",
  "mercedes": "#27F4D2",
  "ferrari": "#E80020",
  "red_bull": "#3671C6",
  "aston_martin": "#229971",
  "alpine": "#0093CC",
  "williams": "#64C4FF",
  "rb": "#6692FF",
  "haas": "#B6BABD",
  "sauber": "#52E252",
  "cadillac": "#C4A747",
};

const getTeamColor = (teamId) => {
  const id = teamId?.toLowerCase().replace(/\s+/g, '_');
  return teamColors[id] || "#666666";
};

export default function DriverComparisonPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [allDrivers, setAllDrivers] = useState([]);
  const [driver1Id, setDriver1Id] = useState(searchParams.get("d1") || "");
  const [driver2Id, setDriver2Id] = useState(searchParams.get("d2") || "");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [dropdown1Open, setDropdown1Open] = useState(false);
  const [dropdown2Open, setDropdown2Open] = useState(false);

  useEffect(() => {
    fetchAllDrivers();
  }, []);

  useEffect(() => {
    if (driver1Id && driver2Id && driver1Id !== driver2Id) {
      fetchComparison();
    } else {
      setComparison(null);
    }
  }, [driver1Id, driver2Id]);

  const fetchAllDrivers = async () => {
    try {
      const res = await apiClient.get("/drivers/all");
      setAllDrivers(res.data);
      
      // Set default drivers if not provided
      if (!driver1Id && res.data.length > 0) {
        setDriver1Id(res.data[0].id);
      }
      if (!driver2Id && res.data.length > 1) {
        setDriver2Id(res.data[1].id);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des pilotes");
    } finally {
      setLoadingDrivers(false);
    }
  };

  const fetchComparison = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/drivers/compare?driver1=${driver1Id}&driver2=${driver2Id}`);
      setComparison(res.data);
    } catch (err) {
      toast.error("Erreur lors de la comparaison");
    } finally {
      setLoading(false);
    }
  };

  const swapDrivers = () => {
    const temp = driver1Id;
    setDriver1Id(driver2Id);
    setDriver2Id(temp);
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
              data-testid="back-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-heading text-lg uppercase tracking-tight text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-cyan-400" />
                Comparateur
              </h1>
              <p className="font-body text-xs text-gray-400">Comparez les statistiques de 2 pilotes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Driver Selectors */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Driver 1 Selector */}
          <div className="relative">
            <button
              onClick={() => { setDropdown1Open(!dropdown1Open); setDropdown2Open(false); }}
              className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg flex items-center justify-between hover:border-cyan-500/50 transition-colors"
              data-testid="driver1-selector"
            >
              <div className="flex items-center gap-2 truncate">
                {driver1Id && allDrivers.find(d => d.id === driver1Id) ? (
                  <>
                    <div 
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ borderColor: getTeamColor(allDrivers.find(d => d.id === driver1Id)?.team_id) }}
                    >
                      <img 
                        src={allDrivers.find(d => d.id === driver1Id)?.photo_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-heading text-sm text-white truncate">
                      {allDrivers.find(d => d.id === driver1Id)?.last_name?.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">Pilote 1</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdown1Open ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdown1Open && (
              <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {allDrivers.filter(d => d.id !== driver2Id).map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => { setDriver1Id(driver.id); setDropdown1Open(false); }}
                    className={`w-full p-2 flex items-center gap-2 hover:bg-gray-800 transition-colors ${driver.id === driver1Id ? 'bg-cyan-500/20' : ''}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ borderColor: getTeamColor(driver.team_id) }}
                    >
                      <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-heading text-xs text-white">{driver.first_name} {driver.last_name}</p>
                      <p className="font-body text-[10px] text-gray-500">{driver.team}</p>
                    </div>
                    {driver.id === driver1Id && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Driver 2 Selector */}
          <div className="relative">
            <button
              onClick={() => { setDropdown2Open(!dropdown2Open); setDropdown1Open(false); }}
              className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg flex items-center justify-between hover:border-cyan-500/50 transition-colors"
              data-testid="driver2-selector"
            >
              <div className="flex items-center gap-2 truncate">
                {driver2Id && allDrivers.find(d => d.id === driver2Id) ? (
                  <>
                    <div 
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ borderColor: getTeamColor(allDrivers.find(d => d.id === driver2Id)?.team_id) }}
                    >
                      <img 
                        src={allDrivers.find(d => d.id === driver2Id)?.photo_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-heading text-sm text-white truncate">
                      {allDrivers.find(d => d.id === driver2Id)?.last_name?.toUpperCase()}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">Pilote 2</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdown2Open ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdown2Open && (
              <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {allDrivers.filter(d => d.id !== driver1Id).map(driver => (
                  <button
                    key={driver.id}
                    onClick={() => { setDriver2Id(driver.id); setDropdown2Open(false); }}
                    className={`w-full p-2 flex items-center gap-2 hover:bg-gray-800 transition-colors ${driver.id === driver2Id ? 'bg-cyan-500/20' : ''}`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full overflow-hidden border-2"
                      style={{ borderColor: getTeamColor(driver.team_id) }}
                    >
                      <img src={driver.photo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-heading text-xs text-white">{driver.first_name} {driver.last_name}</p>
                      <p className="font-body text-[10px] text-gray-500">{driver.team}</p>
                    </div>
                    {driver.id === driver2Id && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center mb-6">
          <button
            onClick={swapDrivers}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full font-body text-xs text-gray-400 hover:text-white hover:border-cyan-500/50 transition-colors flex items-center gap-2"
          >
            <GitCompare className="w-4 h-4" />
            Inverser
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : comparison && d1 && d2 ? (
          <div className="space-y-4">
            {/* Driver Cards Header */}
            <div className="grid grid-cols-2 gap-3">
              <DriverCard driver={d1} />
              <DriverCard driver={d2} />
            </div>

            {/* Stats Comparison */}
            <div className="card-arcade p-4">
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Statistiques F1
              </h3>
              
              <div className="space-y-4">
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
              </div>
            </div>

            {/* Efficiency Stats */}
            <div className="card-arcade p-4">
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Efficacite
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
            </div>

            {/* Quick verdict */}
            <div className="card-arcade p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
              <h3 className="font-heading text-sm text-white mb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                Verdict rapide
              </h3>
              <p className="font-body text-sm text-gray-300">
                {getVerdict(comparison, d1, d2)}
              </p>
            </div>
          </div>
        ) : (
          <div className="card-arcade p-8 text-center">
            <GitCompare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="font-body text-gray-400">
              Selectionnez deux pilotes differents pour les comparer
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Driver Card Component
function DriverCard({ driver }) {
  const navigate = useNavigate();
  const teamColor = getTeamColor(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};
  
  return (
    <div 
      className="card-arcade p-3 cursor-pointer hover:scale-[1.02] transition-transform"
      onClick={() => navigate(`/driver/${driver.id}`)}
      style={{ borderColor: `${teamColor}50` }}
    >
      <div className="flex flex-col items-center">
        <div 
          className="w-16 h-16 rounded-full overflow-hidden border-3 mb-2"
          style={{ borderColor: teamColor, borderWidth: '3px' }}
        >
          <img 
            src={driver.photo_url} 
            alt={driver.full_name}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="font-heading text-sm text-white text-center">
          {driver.first_name}
        </p>
        <p className="font-heading text-base text-center" style={{ color: teamColor }}>
          {driver.last_name?.toUpperCase()}
        </p>
        <p className="font-body text-[10px] text-gray-500 mt-1">{driver.team}</p>
        <div className="flex gap-3 mt-2">
          <div className="text-center">
            <p className="font-data text-sm text-yellow-400">{f1Stats.world_championships || 0}</p>
            <p className="font-body text-[8px] text-gray-500">TITRES</p>
          </div>
          <div className="text-center">
            <p className="font-data text-sm text-white">{f1Stats.wins || 0}</p>
            <p className="font-body text-[8px] text-gray-500">VICT.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Comparison Bar Component
function ComparisonBar({ label, icon: Icon, value1, value2, color1, color2 }) {
  const total = Math.max(value1 + value2, 1);
  const percent1 = (value1 / total) * 100;
  const percent2 = (value2 / total) * 100;
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-data text-sm ${winner === 1 ? 'text-white' : 'text-gray-500'}`}>
          {value1}
        </span>
        <span className="font-body text-xs text-gray-400 flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </span>
        <span className={`font-data text-sm ${winner === 2 ? 'text-white' : 'text-gray-500'}`}>
          {value2}
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
        <div 
          className="h-full transition-all duration-500"
          style={{ width: `${percent1}%`, backgroundColor: color1 }}
        />
        <div 
          className="h-full transition-all duration-500"
          style={{ width: `${percent2}%`, backgroundColor: color2 }}
        />
      </div>
    </div>
  );
}

// Efficiency Card Component
function EfficiencyCard({ label, value1, value2, driver1, driver2, suffix }) {
  const winner = value1 > value2 ? 1 : value2 > value1 ? 2 : 0;
  
  return (
    <div className="bg-gray-800/30 rounded-lg p-3">
      <p className="font-body text-[10px] text-gray-500 uppercase mb-2">{label}</p>
      <div className="flex justify-between items-center">
        <div className="text-center">
          <p className={`font-data text-lg ${winner === 1 ? 'text-green-400' : 'text-white'}`}>
            {value1}{suffix}
          </p>
          <p className="font-body text-[9px] text-gray-500">{driver1.code}</p>
        </div>
        <div className="text-gray-600 font-body text-xs">VS</div>
        <div className="text-center">
          <p className={`font-data text-lg ${winner === 2 ? 'text-green-400' : 'text-white'}`}>
            {value2}{suffix}
          </p>
          <p className="font-body text-[9px] text-gray-500">{driver2.code}</p>
        </div>
      </div>
    </div>
  );
}

// Generate verdict based on comparison
function getVerdict(comparison, d1, d2) {
  const stats = comparison.stats_comparison;
  let d1Wins = 0;
  let d2Wins = 0;
  
  Object.values(stats).forEach(stat => {
    if (stat.winner === "driver1") d1Wins++;
    else if (stat.winner === "driver2") d2Wins++;
  });
  
  if (d1Wins > d2Wins) {
    return `${d1.first_name} ${d1.last_name} domine dans ${d1Wins} categories sur 7. Son experience et ses statistiques en font le favori dans une confrontation directe.`;
  } else if (d2Wins > d1Wins) {
    return `${d2.first_name} ${d2.last_name} domine dans ${d2Wins} categories sur 7. Son profil statistique est superieur dans cette comparaison.`;
  } else {
    return `Ces deux pilotes sont tres proches ! Le resultat d'une confrontation directe dependrait du circuit et des conditions du week-end.`;
  }
}
