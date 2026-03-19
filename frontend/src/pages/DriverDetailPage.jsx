import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { toast } from "sonner";
import { 
  ArrowLeft, Trophy, Medal, Award, Flag, Zap, Timer, Calendar, 
  FileText, DollarSign, MapPin, Ruler, Car, Play, Target, Hash,
  Shield, Info, User, History, Lightbulb, ChevronRight, Star,
  Instagram, Twitter, Loader2
} from "lucide-react";

// Team colors mapping
const teamColors = {
  "mclaren": { primary: "#FF8000", secondary: "#FF8000" },
  "mercedes": { primary: "#27F4D2", secondary: "#00A19C" },
  "ferrari": { primary: "#E80020", secondary: "#DC0000" },
  "red_bull": { primary: "#3671C6", secondary: "#1E5BC6" },
  "aston_martin": { primary: "#229971", secondary: "#006F62" },
  "alpine": { primary: "#0093CC", secondary: "#0078C1" },
  "williams": { primary: "#64C4FF", secondary: "#005AFF" },
  "rb": { primary: "#6692FF", secondary: "#1E41FF" },
  "haas": { primary: "#B6BABD", secondary: "#FFFFFF" },
  "sauber": { primary: "#52E252", secondary: "#00E701" },
  "cadillac": { primary: "#C4A747", secondary: "#1C1C1C" },
};

const getTeamColors = (teamId) => {
  const id = teamId?.toLowerCase().replace(/\s+/g, '_');
  return teamColors[id] || { primary: "#666666", secondary: "#444444" };
};

// Icon mapping for facts
const factIcons = {
  trophy: Trophy,
  flag: Flag,
  medal: Medal,
  zap: Zap,
  timer: Timer,
  award: Award,
  file: FileText,
  dollar: DollarSign,
  calendar: Calendar,
  map: MapPin,
  ruler: Ruler,
  car: Car,
  play: Play,
  target: Target,
  hash: Hash,
  shield: Shield,
  info: Info,
};

export default function DriverDetailPage() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile"); // profile, palmares, facts

  useEffect(() => {
    fetchDriverDetails();
  }, [driverId]);

  const fetchDriverDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/drivers/${driverId}/details`);
      setDriver(res.data);
    } catch (err) {
      console.error("Error fetching driver details:", err);
      toast.error("Impossible de charger les informations du pilote");
      navigate("/championship");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="font-body text-gray-400">Chargement du pilote...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-app-main flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="font-body text-gray-400">Pilote non trouvé</p>
        </div>
      </div>
    );
  }

  const colors = getTeamColors(driver.team_id);
  const f1Stats = driver.palmares?.f1 || {};
  const juniorCareer = driver.palmares?.junior || [];
  const contract = driver.contract || {};
  const facts = driver.useful_facts || [];

  return (
    <div className="min-h-screen bg-app-main pb-24">
      {/* Header with driver photo */}
      <div 
        className="relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}10 50%, #050a14 100%)` 
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/championship")}
          className="absolute top-4 left-4 z-20 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Team number badge */}
        <div 
          className="absolute top-4 right-4 z-20 px-4 py-2 rounded-lg font-data text-3xl text-white"
          style={{ backgroundColor: colors.primary }}
        >
          #{driver.number}
        </div>

        {/* Driver photo */}
        <div className="pt-16 pb-6 px-4 flex justify-center">
          <div className="relative">
            <div 
              className="w-48 h-48 rounded-full border-4 overflow-hidden bg-gray-800"
              style={{ borderColor: colors.primary }}
            >
              <img 
                src={driver.photo_url} 
                alt={driver.full_name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  e.target.src = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/driver_fallback_image.png.transform/1col/image.png";
                }}
              />
            </div>
            {/* Country flag badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 border border-gray-700 rounded-full">
              <span className="font-body text-xs text-gray-300">{driver.country_name}</span>
            </div>
          </div>
        </div>

        {/* Driver name and team */}
        <div className="text-center pb-6 px-4">
          <h1 className="font-heading text-2xl text-white">
            {driver.first_name} <span style={{ color: colors.primary }}>{driver.last_name?.toUpperCase()}</span>
          </h1>
          <p className="font-body text-sm text-gray-400 mt-1">{driver.team}</p>
          
          {/* Quick stats */}
          <div className="flex justify-center gap-6 mt-4">
            {f1Stats.world_championships > 0 && (
              <div className="text-center">
                <p className="font-data text-xl text-yellow-400">{f1Stats.world_championships}</p>
                <p className="font-body text-[10px] text-gray-500 uppercase">Titres</p>
              </div>
            )}
            <div className="text-center">
              <p className="font-data text-xl text-white">{f1Stats.wins || 0}</p>
              <p className="font-body text-[10px] text-gray-500 uppercase">Victoires</p>
            </div>
            <div className="text-center">
              <p className="font-data text-xl text-white">{f1Stats.podiums || 0}</p>
              <p className="font-body text-[10px] text-gray-500 uppercase">Podiums</p>
            </div>
            <div className="text-center">
              <p className="font-data text-xl text-white">{f1Stats.poles || 0}</p>
              <p className="font-body text-[10px] text-gray-500 uppercase">Poles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-30 bg-[#050a14]/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-2">
          <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "profile" 
                  ? "text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={activeTab === "profile" ? { backgroundColor: colors.primary } : {}}
              data-testid="tab-profile"
            >
              <User className="w-3.5 h-3.5" />
              Pilote
            </button>
            <button
              onClick={() => setActiveTab("palmares")}
              className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "palmares" 
                  ? "text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={activeTab === "palmares" ? { backgroundColor: colors.primary } : {}}
              data-testid="tab-palmares"
            >
              <History className="w-3.5 h-3.5" />
              Palmares
            </button>
            <button
              onClick={() => setActiveTab("facts")}
              className={`flex-1 py-2.5 px-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "facts" 
                  ? "text-white shadow-lg" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={activeTab === "facts" ? { backgroundColor: colors.primary } : {}}
              data-testid="tab-facts"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Infos
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            {/* Personal Info */}
            <div className="card-arcade p-4">
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: colors.primary }} />
                Informations personnelles
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Nom complet" value={driver.full_name} />
                <InfoRow label="Date de naissance" value={formatDate(driver.date_of_birth)} />
                <InfoRow label="Lieu de naissance" value={driver.place_of_birth} />
                <InfoRow label="Nationalite" value={driver.country_name} />
                <InfoRow label="Taille" value={driver.height_cm ? `${driver.height_cm} cm` : "-"} />
                <InfoRow label="Poids" value={driver.weight_kg ? `${driver.weight_kg} kg` : "-"} />
              </div>
            </div>

            {/* Contract Info */}
            <div className="card-arcade p-4">
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: colors.primary }} />
                Contrat actuel
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <InfoRow label="Equipe" value={driver.team} />
                <InfoRow label="Numero" value={`#${driver.number}`} />
                <InfoRow label="Debut contrat" value={contract.start_year || "-"} />
                <InfoRow label="Fin contrat" value={contract.end_year || "-"} />
                <InfoRow label="Salaire estime" value={contract.salary_estimate || "-"} />
                <InfoRow label="Points permis" value={`${driver.license_points || 12}/12`} />
              </div>
              {contract.notes && (
                <p className="mt-3 font-body text-xs text-gray-500 italic border-t border-gray-800 pt-3">
                  {contract.notes}
                </p>
              )}
            </div>

            {/* Social Media */}
            {driver.social && (
              <div className="card-arcade p-4">
                <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: colors.primary }} />
                  Reseaux sociaux
                </h3>
                <div className="flex gap-3">
                  {driver.social.instagram && (
                    <a 
                      href={`https://instagram.com/${driver.social.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center gap-2 hover:border-purple-500/50 transition-colors"
                    >
                      <Instagram className="w-5 h-5 text-purple-400" />
                      <span className="font-body text-sm text-white">{driver.social.instagram}</span>
                    </a>
                  )}
                  {driver.social.twitter && (
                    <a 
                      href={`https://twitter.com/${driver.social.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center gap-2 hover:border-blue-500/50 transition-colors"
                    >
                      <Twitter className="w-5 h-5 text-blue-400" />
                      <span className="font-body text-sm text-white">{driver.social.twitter}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Palmares Tab */}
        {activeTab === "palmares" && (
          <div className="space-y-4">
            {/* F1 Career Stats */}
            <div className="card-arcade p-4">
              <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Carriere F1
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatCard 
                  value={f1Stats.world_championships || 0} 
                  label="Titres" 
                  color="text-yellow-400"
                  bgColor="bg-yellow-500/10"
                />
                <StatCard 
                  value={f1Stats.wins || 0} 
                  label="Victoires" 
                  color="text-green-400"
                  bgColor="bg-green-500/10"
                />
                <StatCard 
                  value={f1Stats.podiums || 0} 
                  label="Podiums" 
                  color="text-cyan-400"
                  bgColor="bg-cyan-500/10"
                />
                <StatCard 
                  value={f1Stats.poles || 0} 
                  label="Poles" 
                  color="text-purple-400"
                  bgColor="bg-purple-500/10"
                />
                <StatCard 
                  value={f1Stats.fastest_laps || 0} 
                  label="Meilleurs tours" 
                  color="text-pink-400"
                  bgColor="bg-pink-500/10"
                />
                <StatCard 
                  value={f1Stats.points || 0} 
                  label="Points" 
                  color="text-white"
                  bgColor="bg-gray-500/10"
                />
              </div>
              <div className="border-t border-gray-800 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-body text-xs text-gray-500">Saisons</span>
                  <span className="font-body text-sm text-white">{f1Stats.seasons || "-"}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-body text-xs text-gray-500">Premiere equipe</span>
                  <span className="font-body text-sm text-white">{f1Stats.first_team || "-"}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-body text-xs text-gray-500">Grands Prix disputes</span>
                  <span className="font-body text-sm text-white">{f1Stats.entries || 0}</span>
                </div>
              </div>
            </div>

            {/* Junior Career */}
            {juniorCareer.length > 0 && (
              <div className="card-arcade p-4">
                <h3 className="font-heading text-sm text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" />
                  Carriere junior
                </h3>
                <div className="space-y-2">
                  {juniorCareer.map((season, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        season.position === 1 
                          ? "bg-yellow-500/10 border-yellow-500/30" 
                          : season.position === 2 
                            ? "bg-gray-400/10 border-gray-400/30"
                            : season.position === 3
                              ? "bg-amber-600/10 border-amber-600/30"
                              : "bg-gray-800/30 border-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`font-data text-xl ${
                            season.position === 1 ? "text-yellow-400" :
                            season.position === 2 ? "text-gray-300" :
                            season.position === 3 ? "text-amber-500" : "text-gray-500"
                          }`}>
                            {season.position === 1 && <Trophy className="w-5 h-5 inline" />}
                            {season.position !== 1 && `P${season.position}`}
                          </span>
                          <div>
                            <p className="font-heading text-sm text-white">{season.series}</p>
                            <p className="font-body text-xs text-gray-500">{season.team}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-data text-lg text-white">{season.year}</p>
                          {season.wins > 0 && (
                            <p className="font-body text-xs text-green-400">{season.wins} victoires</p>
                          )}
                        </div>
                      </div>
                      {season.note && (
                        <p className="font-body text-xs text-gray-500 mt-2 italic">{season.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Facts Tab */}
        {activeTab === "facts" && (
          <div className="space-y-3">
            <div className="card-arcade p-4 mb-4">
              <h3 className="font-heading text-sm text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                10 infos utiles sur {driver.first_name}
              </h3>
              <p className="font-body text-xs text-gray-500 mt-1">
                Des faits interessants pour vos pronostics
              </p>
            </div>

            {facts.map((fact, idx) => {
              const IconComponent = factIcons[fact.icon] || Info;
              return (
                <div 
                  key={idx}
                  className="card-arcade p-4 flex items-start gap-3"
                  style={{ borderLeftWidth: '3px', borderLeftColor: colors.primary }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <IconComponent className="w-5 h-5" style={{ color: colors.primary }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading text-sm text-white">{fact.title}</p>
                    <p className="font-body text-xs text-gray-400 mt-1">{fact.text}</p>
                  </div>
                  <span className="font-data text-xs text-gray-600">#{idx + 1}</span>
                </div>
              );
            })}

            {facts.length === 0 && (
              <div className="card-arcade p-8 text-center">
                <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="font-body text-gray-400">Aucune information disponible</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function InfoRow({ label, value }) {
  return (
    <div>
      <p className="font-body text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="font-body text-sm text-white">{value || "-"}</p>
    </div>
  );
}

function StatCard({ value, label, color, bgColor }) {
  return (
    <div className={`p-3 rounded-lg ${bgColor} text-center`}>
      <p className={`font-data text-2xl ${color}`}>{value}</p>
      <p className="font-body text-[10px] text-gray-500 uppercase">{label}</p>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
