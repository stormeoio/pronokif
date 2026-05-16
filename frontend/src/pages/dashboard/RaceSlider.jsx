import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Flag, Clock, ChevronRight, Zap, Target,
  Calendar, MapPin, ChevronLeft, Info
} from "lucide-react";

// GP Background images
const GP_BACKGROUNDS = {
  monaco: "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png",
  default: "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png"
};

function getGPBackground(raceName) {
  const name = raceName?.toLowerCase() || '';
  if (name.includes('monaco')) return GP_BACKGROUNDS.monaco;
  return GP_BACKGROUNDS.default;
}

export default function RaceSlider({
  upcomingRaces, currentRaceIndex, setCurrentRaceIndex,
  currentRace, currentPrediction, countdown, sprintCountdown
}) {
  const navigate = useNavigate();

  const handlePrevRace = () => {
    if (currentRaceIndex > 0) setCurrentRaceIndex(prev => prev - 1);
  };
  const handleNextRace = () => {
    if (currentRaceIndex < upcomingRaces.length - 1) setCurrentRaceIndex(prev => prev + 1);
  };

  if (!upcomingRaces.length || !currentRace) return null;

  return (
    <div className="card-arcade overflow-hidden" data-testid="race-slider">
      {/* Slider Navigation Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-cyan-900/30 to-transparent border-b border-cyan-500/20">
        <button onClick={handlePrevRace} disabled={currentRaceIndex === 0}
          className={`p-1.5 rounded-lg transition-all ${currentRaceIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-cyan-400 hover:bg-cyan-500/20 active:scale-95'}`}
          data-testid="prev-race-btn">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {upcomingRaces.slice(0, 12).map((_, i) => (
            <button key={i} onClick={() => setCurrentRaceIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentRaceIndex ? 'bg-cyan-400 w-3' : 'bg-gray-600 hover:bg-gray-500'}`}
              data-testid={`race-dot-${i}`} />
          ))}
          {upcomingRaces.length > 12 && <span className="text-[9px] text-gray-500 ml-1">+{upcomingRaces.length - 12}</span>}
        </div>
        <button onClick={handleNextRace} disabled={currentRaceIndex === upcomingRaces.length - 1}
          className={`p-1.5 rounded-lg transition-all ${currentRaceIndex === upcomingRaces.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-cyan-400 hover:bg-cyan-500/20 active:scale-95'}`}
          data-testid="next-race-btn">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* GP Scenic Background */}
      <div className="relative h-40 bg-cover bg-center cursor-pointer group"
        style={{ backgroundImage: `url(${getGPBackground(currentRace.name)})` }}
        onClick={() => navigate(`/race/${currentRace.id}`)} data-testid="race-card-clickable">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#0c1525] group-hover:from-black/30 transition-all" />
        <button onClick={(e) => { e.stopPropagation(); navigate(`/race/${currentRace.id}`); }}
          className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 text-white text-xs font-body hover:bg-white/20 transition-all z-10"
          data-testid="view-details-btn">
          <Info className="w-3 h-3" /> Infos / Horaires
        </button>
        {currentRace.is_sprint_weekend && (
          <div className="absolute top-12 right-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-heading text-xs px-3 py-1 rounded-full shadow-lg animate-gold">SPRINT</div>
        )}
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white font-heading text-xs px-2 py-1 rounded-full">
          {currentRaceIndex + 1}/{upcomingRaces.length}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-body text-xs text-cyan-300 uppercase tracking-widest mb-1 drop-shadow-lg">
            {currentRaceIndex === 0 ? "Prochain Grand Prix" : "À venir"}
          </p>
          <h2 className="font-heading text-2xl text-white uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(251,191,36,0.4)'}}>
            {currentRace.name.replace(" Grand Prix", "")}
          </h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="font-body text-xs text-white flex items-center gap-1 drop-shadow-lg"><MapPin className="w-3 h-3 text-red-400" /> {currentRace.circuit}</span>
            <span className="font-body text-xs text-white flex items-center gap-1 drop-shadow-lg"><Calendar className="w-3 h-3 text-blue-400" /> {new Date(currentRace.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>

      {/* Countdown Section */}
      {currentRace.is_sprint_weekend ? (
        <div className="p-4 border-t border-blue-500/30 space-y-4">
          <CountdownRow label="Course Sprint" icon={<Zap className="w-4 h-4" />} subLabel="(clôture 15 min avant SQ1)" countdown={sprintCountdown} variant="sprint" />
          <CountdownRow label="Course Principale" icon={<Flag className="w-4 h-4" />} subLabel="(clôture 15 min avant Q1)" countdown={countdown} variant="main" />
        </div>
      ) : currentRace.can_predict ? (
        <div className="p-3 border-t border-blue-500/30">
          <CountdownRow label="Clôture 15 min avant Q1" icon={<Clock className="w-4 h-4" />} countdown={countdown} variant="main" />
        </div>
      ) : null}

      {!currentRace.can_predict && !currentRace.is_sprint_weekend && (
        <div className="p-4 border-t border-orange-500/30 bg-orange-500/10">
          <p className="font-body text-sm text-center text-orange-400">Les pronostics sont fermés pour cette course</p>
        </div>
      )}

      {/* Prediction Status & CTA */}
      <div className="p-4">
        {currentPrediction ? (
          <div className="flex items-center justify-between bg-green-500/10 border-2 border-green-500/50 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-heading text-green-400 text-sm uppercase">Pronos enregistrés !</span>
                <p className="font-body text-xs text-gray-400">Bonne chance pour ce GP</p>
              </div>
            </div>
            {currentRace.can_predict && (
              <Button onClick={() => navigate(`/predictions/${currentRace.id}`)} className="btn-gold text-sm px-5 py-2">Modifier</Button>
            )}
          </div>
        ) : currentRace.can_predict ? (
          <Button onClick={() => navigate(`/predictions/${currentRace.id}`)} className="btn-racing w-full h-14 text-lg animate-neon" data-testid="make-predictions-btn">
            <Target className="w-5 h-5 mr-2" /> FAIRE MES PRONOS
          </Button>
        ) : (
          <div className="text-center py-2"><p className="font-body text-sm text-gray-500">Pronostics fermés</p></div>
        )}
      </div>
    </div>
  );
}

function CountdownRow({ label, icon, subLabel, countdown, variant }) {
  const colorClass = variant === "sprint" ? "text-yellow-400" : "text-cyan-400";
  const digitBg = variant === "sprint" ? "bg-yellow-500/10 border-yellow-500/30" : "";
  const digitColor = variant === "sprint" ? "text-yellow-400" : "";
  const digitSubColor = variant === "sprint" ? "text-yellow-600" : "text-gray-400";

  return (
    <div>
      <p className={`font-body text-xs text-center ${colorClass} uppercase mb-2 tracking-wider flex items-center justify-center gap-2`}>
        {icon} {label}
        {subLabel && <span className="text-gray-500 text-[10px]">{subLabel}</span>}
      </p>
      <div className="flex justify-center gap-2">
        {[
          { value: countdown.days, label: "J" },
          { value: countdown.hours, label: "H" },
          { value: countdown.minutes, label: "M" },
          { value: countdown.seconds, label: "S" }
        ].map((item, i) => (
          <div key={i} className={`countdown-digit w-12 h-12 flex flex-col items-center justify-center ${digitBg ? digitBg + ' rounded-lg' : ''}`}>
            <span className={`text-lg font-bold ${digitColor}`}>{String(item.value).padStart(2, '0')}</span>
            <span className={`text-[8px] ${digitSubColor} tracking-wider`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
