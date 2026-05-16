import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { 
  ArrowLeft, MapPin, Calendar, Clock, Flag, Zap,
  Timer, Route, CornerDownRight, Target, ChevronRight
} from "lucide-react";

// Circuit layout images (SVG-style track maps from Wikipedia/F1 sources)
const CIRCUIT_IMAGES = {
  "Albert Park": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Albert_Park_Circuit_2021.svg/400px-Albert_Park_Circuit_2021.svg.png",
  "Shanghai": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Shanghai_International_Racing_Circuit_track_map.svg/400px-Shanghai_International_Racing_Circuit_track_map.svg.png",
  "Suzuka": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Suzuka_circuit_map--2005.svg/400px-Suzuka_circuit_map--2005.svg.png",
  "Sakhir": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Bahrain_International_Circuit--Grand_Prix_Layout.svg/400px-Bahrain_International_Circuit--Grand_Prix_Layout.svg.png",
  "Jeddah": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Jeddah_Street_Circuit_2021.svg/400px-Jeddah_Street_Circuit_2021.svg.png",
  "Miami": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Miami_International_Autodrome_track_map.svg/400px-Miami_International_Autodrome_track_map.svg.png",
  "Imola": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Imola_2009.svg/400px-Imola_2009.svg.png",
  "Monaco": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Monte_Carlo_Formula_1_track_map.svg/400px-Monte_Carlo_Formula_1_track_map.svg.png",
  "Barcelona": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Circuit_Catalunya_2021.svg/400px-Circuit_Catalunya_2021.svg.png",
  "Montreal": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Circuit_Gilles_Villeneuve.svg/400px-Circuit_Gilles_Villeneuve.svg.png",
  "Red Bull Ring": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Circuit_Red_Bull_Ring.svg/400px-Circuit_Red_Bull_Ring.svg.png",
  "Silverstone": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Circuit_Silverstone_2020.svg/400px-Circuit_Silverstone_2020.svg.png",
  "Spa-Francorchamps": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Circuit_de_Spa-Francorchamps_2022.svg/400px-Circuit_de_Spa-Francorchamps_2022.svg.png",
  "Hungaroring": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Hungaroring.svg/400px-Hungaroring.svg.png",
  "Zandvoort": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Circuit_Zandvoort_layout_2020.svg/400px-Circuit_Zandvoort_layout_2020.svg.png",
  "Monza": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Autodromo_Nazionale_Monza_track_map.svg/400px-Autodromo_Nazionale_Monza_track_map.svg.png",
  "Marina Bay": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Marina_Bay_Circuit_2023.svg/400px-Marina_Bay_Circuit_2023.svg.png",
  "COTA": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Circuit_of_the_Americas_track_map.svg/400px-Circuit_of_the_Americas_track_map.svg.png",
  "Hermanos Rodríguez": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_2015.svg/400px-Aut%C3%B3dromo_Hermanos_Rodr%C3%ADguez_2015.svg.png",
  "Interlagos": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace_%28AKA_Interlagos%29_track_map.svg/400px-Aut%C3%B3dromo_Jos%C3%A9_Carlos_Pace_%28AKA_Interlagos%29_track_map.svg.png",
  "Las Vegas": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Las_Vegas_Street_Circuit_2023.svg/400px-Las_Vegas_Street_Circuit_2023.svg.png",
  "Lusail": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Lusail_International_Circuit_Formula_One_layout_2023.svg/400px-Lusail_International_Circuit_Formula_One_layout_2023.svg.png",
  "Yas Marina": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Yas_Marina_Circuit_2021.svg/400px-Yas_Marina_Circuit_2021.svg.png",
  "Baku": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Baku_Formula_One_circuit_map.svg/400px-Baku_Formula_One_circuit_map.svg.png",
  "Madrid": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Madrid_Grand_Prix_circuit.svg/400px-Madrid_Grand_Prix_circuit.svg.png"
};

// Country flag emojis
const COUNTRY_FLAGS = {
  "Australia": "🇦🇺",
  "China": "🇨🇳",
  "Japan": "🇯🇵",
  "Bahrain": "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  "USA": "🇺🇸",
  "Italy": "🇮🇹",
  "Monaco": "🇲🇨",
  "Spain": "🇪🇸",
  "Canada": "🇨🇦",
  "Austria": "🇦🇹",
  "UK": "🇬🇧",
  "Belgium": "🇧🇪",
  "Hungary": "🇭🇺",
  "Netherlands": "🇳🇱",
  "Azerbaijan": "🇦🇿",
  "Singapore": "🇸🇬",
  "Mexico": "🇲🇽",
  "Brazil": "🇧🇷",
  "Qatar": "🇶🇦",
  "UAE": "🇦🇪"
};

export default function GrandPrixDetailPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

  const { data: raceDetails = null, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["/races", raceId, "details"],
    queryFn: async () => {
      const res = await apiClient.get(`/races/${raceId}/details`);
      return res.data;
    },
    enabled: !!raceId,
  });

  const error = queryError ? "Impossible de charger les détails du Grand Prix" : null;

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });
  };

  const getSessionColor = (shortName) => {
    const colors = {
      "FP1": "from-gray-500 to-gray-600",
      "FP2": "from-gray-500 to-gray-600",
      "FP3": "from-gray-500 to-gray-600",
      "SQ": "from-orange-500 to-orange-600",
      "SPRINT": "from-yellow-500 to-yellow-600",
      "QUALI": "from-purple-500 to-purple-600",
      "COURSE": "from-red-500 to-red-600"
    };
    return colors[shortName] || "from-blue-500 to-blue-600";
  };

  const isPastSession = (isoString) => {
    return new Date(isoString) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-12 skeleton-arcade rounded-xl w-32" />
          <div className="h-64 skeleton-arcade rounded-xl" />
          <div className="h-48 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !raceDetails) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-cyan-400 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          <div className="card-arcade p-6 text-center">
            <p className="text-red-400">{error || "Grand Prix non trouvé"}</p>
          </div>
        </div>
      </div>
    );
  }

  const circuitImage = CIRCUIT_IMAGES[raceDetails.circuit.name];
  const countryFlag = COUNTRY_FLAGS[raceDetails.country] || "🏁";

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="grandprix-detail-page">
      {/* Header with back button */}
      <div className="bg-gradient-to-b from-[#0a1628] to-transparent p-4">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-body text-sm">Retour</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4">
        {/* Race Header Card */}
        <div className="card-arcade overflow-hidden">
          {/* Title Section */}
          <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-blue-900/30 to-transparent">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-body text-xs text-cyan-400 uppercase tracking-widest mb-1">
                  Grand Prix
                </p>
                <h1 className="font-heading text-2xl text-white uppercase tracking-tight">
                  {raceDetails.name.replace(" Grand Prix", "")}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl">{countryFlag}</span>
                  <span className="font-body text-sm text-gray-300">{raceDetails.country}</span>
                </div>
              </div>
              {raceDetails.is_sprint_weekend && (
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-heading text-xs px-3 py-1 rounded-full shadow animate-gold">
                  SPRINT
                </div>
              )}
            </div>
          </div>

          {/* Circuit Layout Image */}
          <div className="p-4 bg-gradient-to-b from-[#0c1525] to-[#0a1220]">
            <div className="relative rounded-xl overflow-hidden bg-white/5 border border-white/10">
              {circuitImage ? (
                <img 
                  src={circuitImage}
                  alt={`Circuit ${raceDetails.circuit.full_name}`}
                  className="w-full h-48 object-contain p-4 filter invert opacity-90"
                  data-testid="circuit-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const placeholder = e.target.parentElement.querySelector('.circuit-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`circuit-placeholder w-full h-48 flex-col items-center justify-center ${circuitImage ? 'hidden' : 'flex'}`}
                   style={{ display: circuitImage ? 'none' : 'flex' }}>
                <Route className="w-16 h-16 text-cyan-500/50 mb-2" />
                <p className="text-gray-400 text-sm font-body">{raceDetails.circuit.name}</p>
              </div>
              {/* Circuit Name Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0c1525] to-transparent p-3">
                <p className="font-heading text-lg text-white text-center" data-testid="circuit-name">
                  {raceDetails.circuit.full_name}
                </p>
              </div>
            </div>
          </div>

          {/* Circuit Stats */}
          <div className="grid grid-cols-3 gap-2 p-4 bg-[#0a1220]">
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <Route className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <p className="font-data text-lg text-white" data-testid="circuit-length">
                {raceDetails.circuit.length_km?.toFixed(3) || "N/A"}
              </p>
              <p className="font-body text-[10px] text-gray-500 uppercase tracking-wider">km</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <CornerDownRight className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="font-data text-lg text-white" data-testid="circuit-turns">
                {raceDetails.circuit.turns || "N/A"}
              </p>
              <p className="font-body text-[10px] text-gray-500 uppercase tracking-wider">virages</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <Flag className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="font-data text-lg text-white" data-testid="circuit-laps">
                {raceDetails.circuit.laps || "N/A"}
              </p>
              <p className="font-body text-[10px] text-gray-500 uppercase tracking-wider">tours</p>
            </div>
          </div>

          <div className="h-2 bg-kerb-stripe" />
        </div>

        {/* Sessions Schedule Card */}
        <div className="card-arcade overflow-hidden">
          <div className="p-4 border-b border-blue-500/30 bg-gradient-to-r from-purple-900/20 to-transparent">
            <h2 className="font-heading text-lg text-white uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Programme du Week-end
            </h2>
          </div>

          <div className="p-4 space-y-2">
            {raceDetails.sessions.map((session, index) => {
              const isPast = isPastSession(session.datetime);
              return (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isPast ? 'bg-white/5 opacity-60' : 'bg-white/10 border border-white/10'
                  }`}
                  data-testid={`session-${session.short_name.toLowerCase()}`}
                >
                  {/* Session Badge */}
                  <div className={`w-16 h-12 rounded-lg bg-gradient-to-br ${getSessionColor(session.short_name)} flex items-center justify-center shadow-lg`}>
                    <span className="font-heading text-xs text-white">{session.short_name}</span>
                  </div>
                  
                  {/* Session Info */}
                  <div className="flex-1">
                    <p className={`font-body text-sm ${isPast ? 'text-gray-500' : 'text-white'}`}>
                      {session.name}
                    </p>
                    <p className={`font-body text-xs ${isPast ? 'text-gray-600' : 'text-gray-400'}`}>
                      {formatDate(session.datetime)}
                    </p>
                  </div>
                  
                  {/* Time */}
                  <div className="text-right">
                    <p className={`font-data text-lg ${isPast ? 'text-gray-500' : 'text-cyan-400'}`}>
                      {formatTime(session.datetime)}
                    </p>
                    <p className="font-body text-[10px] text-gray-500 uppercase">heure FR</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="h-2 bg-kerb-stripe" />
        </div>

        {/* Predictions CTA */}
        {raceDetails.status === "upcoming" && (
          <div className="card-arcade p-4">
            <Button 
              onClick={() => navigate(`/predictions/${raceId}`)}
              className="btn-racing w-full h-14 text-lg animate-neon"
              data-testid="make-predictions-cta"
            >
              <Target className="w-5 h-5 mr-2" />
              FAIRE MES PRONOS
            </Button>
          </div>
        )}

        {raceDetails.status === "finished" && (
          <div className="card-arcade p-4">
            <Button 
              onClick={() => navigate(`/results/${raceId}`)}
              className="btn-gold w-full h-12"
              data-testid="view-results-cta"
            >
              Voir les résultats
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
