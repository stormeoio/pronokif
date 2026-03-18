import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { 
  Flag, Trophy, Clock, ChevronRight, Zap, Target,
  Calendar, MapPin, Users, Star,
  ChevronLeft, Info, Plus, MessageCircle, HelpCircle
} from "lucide-react";
import { AvatarDisplay } from "../components/AvatarDisplay";
import NotificationBell from "../components/NotificationBell";
import FeedbackModal from "../components/FeedbackModal";
import HamburgerMenu from "../components/HamburgerMenu";

// GP Background images - will be expanded with more circuits
const GP_BACKGROUNDS = {
  monaco: "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png",
  default: "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/84bf8f32c39693df24f61199e48ea90a376cae9f73cc5c8550bc87301e7c8ec1.png"
};

// Hero banner with F1 car (no text - we overlay via CSS)
const HERO_BANNER = "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/d9b6f1a65194f54bbc34bb7e15e4af8069ab64dab312c6c3be1db79b2ca45259.png";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [nextRace, setNextRace] = useState(null);
  const [upcomingRaces, setUpcomingRaces] = useState([]);
  const [currentRaceIndex, setCurrentRaceIndex] = useState(0);
  const [league, setLeague] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myPrediction, setMyPrediction] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [sprintCountdown, setSprintCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [avatars, setAvatars] = useState({});
  const sliderRef = useRef(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [unreadChatByLeague, setUnreadChatByLeague] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [raceRes, upcomingRes, avatarsRes, unreadRes] = await Promise.all([
        apiClient.get("/races/next"),
        apiClient.get("/races/upcoming"),
        apiClient.get("/avatars"),
        apiClient.get("/leagues/unread-messages").catch(() => ({ data: { by_league: {} } }))
      ]);
      setNextRace(raceRes.data);
      setAvatars(avatarsRes.data);
      setUnreadChatByLeague(unreadRes.data.by_league || {});
      
      // Filter upcoming races that can still be predicted or are in progress
      const upcoming = upcomingRes.data.filter(r => r.status !== "finished").slice(0, 8);
      setUpcomingRaces(upcoming);

      if (user.current_league_id) {
        const [leagueRes, lbRes] = await Promise.all([
          apiClient.get(`/leagues/${user.current_league_id}`),
          apiClient.get(`/leagues/${user.current_league_id}/leaderboard`)
        ]);
        setLeague(leagueRes.data);
        setLeaderboard(lbRes.data.slice(0, 3));
      }

      // Fetch predictions for all upcoming races
      const predsPromises = upcoming.map(race => 
        apiClient.get(`/predictions/race/${race.id}`).catch(() => ({ data: null }))
      );
      const predsResults = await Promise.all(predsPromises);
      const predsMap = {};
      upcoming.forEach((race, i) => {
        predsMap[race.id] = predsResults[i].data;
      });
      setPredictions(predsMap);
      
      if (raceRes.data) {
        setMyPrediction(predsMap[raceRes.data.id] || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.current_league_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const currentRace = upcomingRaces[currentRaceIndex];
    if (!currentRace?.predictions_close_at) return;
    
    const updateCountdown = () => {
      // Main race countdown (15 min before Q1)
      const mainDiff = new Date(currentRace.predictions_close_at) - new Date();
      if (mainDiff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setCountdown({
          days: Math.floor(mainDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((mainDiff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((mainDiff / (1000 * 60)) % 60),
          seconds: Math.floor((mainDiff / 1000) % 60)
        });
      }

      // Sprint countdown (15 min before SQ1) - only for sprint weekends
      if (currentRace.is_sprint_weekend && currentRace.sprint_predictions_close_at) {
        const sprintDiff = new Date(currentRace.sprint_predictions_close_at) - new Date();
        if (sprintDiff <= 0) {
          setSprintCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          setSprintCountdown({
            days: Math.floor(sprintDiff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((sprintDiff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((sprintDiff / (1000 * 60)) % 60),
            seconds: Math.floor((sprintDiff / 1000) % 60)
          });
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [upcomingRaces, currentRaceIndex]);

  const getAvatarById = (avatarId) => {
    return avatars?.all?.find(a => a.id === avatarId) || null;
  };

  const getGPBackground = (raceName) => {
    const name = raceName?.toLowerCase() || '';
    if (name.includes('monaco')) return GP_BACKGROUNDS.monaco;
    return GP_BACKGROUNDS.default;
  };

  const handlePrevRace = () => {
    if (currentRaceIndex > 0) {
      setCurrentRaceIndex(prev => prev - 1);
    }
  };

  const handleNextRace = () => {
    if (currentRaceIndex < upcomingRaces.length - 1) {
      setCurrentRaceIndex(prev => prev + 1);
    }
  };

  const currentRace = upcomingRaces[currentRaceIndex];
  const currentPrediction = currentRace ? predictions[currentRace.id] : null;

  const myPosition = leaderboard.findIndex(e => e.user_id === user?.id) + 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-48 skeleton-arcade rounded-xl" />
          <div className="h-64 skeleton-arcade rounded-xl" />
          <div className="h-40 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="dashboard-page">
      {/* Compact Profile Banner - Clickable to go to profile */}
      <div 
        onClick={() => navigate("/profile")}
        className="relative z-20 bg-gradient-to-r from-[#0a1628] via-[#0c1a30] to-[#0a1628] cursor-pointer hover:from-[#0c1a30] hover:via-[#0f1f3a] hover:to-[#0c1a30] transition-all border-b border-cyan-500/20"
        data-testid="profile-banner"
      >
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="ring-2 ring-yellow-500 rounded-full p-0.5">
              <AvatarDisplay avatar={getAvatarById(user?.avatar_id)} customUrl={user?.custom_avatar_url} size="sm" />
            </div>
            <div>
              <p className="font-heading text-sm text-white uppercase tracking-wide">{user?.username}</p>
              <div className="flex items-center gap-2">
                <span className="font-body text-[10px] text-white bg-gradient-to-r from-blue-600 to-blue-800 px-1.5 py-0.5 rounded-full shadow">
                  Niv. {user?.level || 1}
                </span>
                <span className="font-data text-[10px] text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-yellow-500 text-yellow-400" /> {user?.xp || 0} XP
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {league && (
              <div className="text-right hidden sm:block">
                <p className="font-body text-[9px] text-gray-500 uppercase tracking-wider">Ligue</p>
                <p className="font-heading text-xs text-cyan-400">{league.name}</p>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Top Bar with Menu, Notifications and Help */}
      <div className="absolute top-0 left-0 right-0 z-30 p-3 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <HamburgerMenu />
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <NotificationBell />
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="p-2 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors"
            data-testid="help-admin-btn"
            title="Aider l'administrateur"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Banner with F1 Car and Logo */}
      <div className="relative w-full h-56 overflow-hidden">
        <img 
          src={HERO_BANNER} 
          alt="PRONOKIF" 
          className="w-full h-full object-cover object-center"
        />
        {/* PRONOKIF + Slogan overlay - at top, above the car */}
        <div className="absolute top-3 left-0 right-0 text-center z-10">
          <h1 className="font-heading text-3xl text-white tracking-wider uppercase"
              style={{textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)'}}>
            PRONOKIF
          </h1>
          <p className="font-body text-[10px] text-white tracking-[0.08em] font-medium mt-1"
             style={{textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)'}}>
            Pronostique 🔹 Défie tes amis 🔹 Domine le classement
          </p>
        </div>
        {/* Gradient overlay at bottom for smooth transition */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050a14] to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4 relative z-10">
        {/* Race Slider Card - Main Feature */}
        {upcomingRaces.length > 0 && currentRace && (
          <div className="card-arcade overflow-hidden" data-testid="race-slider">
            {/* Slider Navigation Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-900/30 to-transparent border-b border-cyan-500/20">
              <button 
                onClick={handlePrevRace}
                disabled={currentRaceIndex === 0}
                className={`p-2 rounded-lg transition-all ${
                  currentRaceIndex === 0 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : 'text-cyan-400 hover:bg-cyan-500/20 active:scale-95'
                }`}
                data-testid="prev-race-btn"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                {upcomingRaces.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentRaceIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentRaceIndex 
                        ? 'bg-cyan-400 w-4' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                    data-testid={`race-dot-${i}`}
                  />
                ))}
              </div>

              <button 
                onClick={handleNextRace}
                disabled={currentRaceIndex === upcomingRaces.length - 1}
                className={`p-2 rounded-lg transition-all ${
                  currentRaceIndex === upcomingRaces.length - 1 
                    ? 'text-gray-600 cursor-not-allowed' 
                    : 'text-cyan-400 hover:bg-cyan-500/20 active:scale-95'
                }`}
                data-testid="next-race-btn"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* GP Scenic Background - Clickable for details */}
            <div 
              className="relative h-32 bg-cover bg-center cursor-pointer group"
              style={{ backgroundImage: `url(${getGPBackground(currentRace.name)})` }}
              onClick={() => navigate(`/race/${currentRace.id}`)}
              data-testid="race-card-clickable"
            >
              {/* Dark overlay for better text contrast */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-[#0c1525] group-hover:from-black/40 transition-all" />
              
              {/* Info/Horaires link - positioned on the right */}
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(`/race/${currentRace.id}`); }}
                className="absolute top-3 right-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1 text-white text-xs font-body hover:bg-white/20 transition-all z-10"
                data-testid="view-details-btn"
              >
                <Info className="w-3 h-3" />
                Infos / Horaires
              </button>
              
              {/* Sprint badge */}
              {currentRace.is_sprint_weekend && (
                <div className="absolute top-12 right-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 font-heading text-xs px-3 py-1 rounded-full shadow-lg animate-gold">
                  SPRINT
                </div>
              )}
              
              {/* Race index badge */}
              <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white font-heading text-xs px-2 py-1 rounded-full">
                {currentRaceIndex + 1}/{upcomingRaces.length}
              </div>
              
              {/* Race Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-body text-xs text-cyan-300 uppercase tracking-widest mb-1 drop-shadow-lg">
                  {currentRaceIndex === 0 ? "Prochain Grand Prix" : "À venir"}
                </p>
                <h2 className="font-heading text-2xl text-white uppercase tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(251,191,36,0.4)'}}>
                  {currentRace.name.replace(" Grand Prix", "")}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="font-body text-xs text-white flex items-center gap-1 drop-shadow-lg">
                    <MapPin className="w-3 h-3 text-red-400" /> {currentRace.circuit}
                  </span>
                  <span className="font-body text-xs text-white flex items-center gap-1 drop-shadow-lg">
                    <Calendar className="w-3 h-3 text-blue-400" /> {new Date(currentRace.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Countdown Section - Different for Sprint vs Classic */}
            {currentRace.is_sprint_weekend ? (
              /* Sprint Weekend - Two countdowns */
              <div className="p-4 border-t border-blue-500/30 space-y-4">
                {/* Sprint Countdown */}
                <div>
                  <p className="font-body text-xs text-center text-yellow-400 uppercase mb-2 tracking-wider flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" /> Course Sprint
                    <span className="text-gray-500 text-[10px]">(clôture 15 min avant SQ1)</span>
                  </p>
                  <div className="flex justify-center gap-2">
                    {[
                      { value: sprintCountdown.days, label: "J" },
                      { value: sprintCountdown.hours, label: "H" },
                      { value: sprintCountdown.minutes, label: "M" },
                      { value: sprintCountdown.seconds, label: "S" }
                    ].map((item, i) => (
                      <div key={i} className="countdown-digit w-12 h-12 flex flex-col items-center justify-center bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <span className="text-lg font-bold text-yellow-400">{String(item.value).padStart(2, '0')}</span>
                        <span className="text-[8px] text-yellow-600 tracking-wider">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Main Race Countdown */}
                <div>
                  <p className="font-body text-xs text-center text-cyan-400 uppercase mb-2 tracking-wider flex items-center justify-center gap-2">
                    <Flag className="w-4 h-4" /> Course Principale
                    <span className="text-gray-500 text-[10px]">(clôture 15 min avant Q1)</span>
                  </p>
                  <div className="flex justify-center gap-2">
                    {[
                      { value: countdown.days, label: "J" },
                      { value: countdown.hours, label: "H" },
                      { value: countdown.minutes, label: "M" },
                      { value: countdown.seconds, label: "S" }
                    ].map((item, i) => (
                      <div key={i} className="countdown-digit w-12 h-12 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">{String(item.value).padStart(2, '0')}</span>
                        <span className="text-[8px] text-gray-400 tracking-wider">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Classic Weekend - Single countdown */
              currentRace.can_predict && (
                <div className="p-3 border-t border-blue-500/30">
                  <p className="font-body text-xs text-center text-cyan-neon uppercase mb-2 tracking-wider flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" /> Clôture 15 min avant Q1
                  </p>
                  <div className="flex justify-center gap-2">
                    {[
                      { value: countdown.days, label: "J" },
                      { value: countdown.hours, label: "H" },
                      { value: countdown.minutes, label: "M" },
                      { value: countdown.seconds, label: "S" }
                    ].map((item, i) => (
                      <div key={i} className="countdown-digit w-12 h-12 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">{String(item.value).padStart(2, '0')}</span>
                        <span className="text-[8px] text-gray-400 tracking-wider">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {!currentRace.can_predict && !currentRace.is_sprint_weekend && (
              <div className="p-4 border-t border-orange-500/30 bg-orange-500/10">
                <p className="font-body text-sm text-center text-orange-400">
                  Les pronostics sont fermés pour cette course
                </p>
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
                    <Button onClick={() => navigate(`/predictions/${currentRace.id}`)} className="btn-gold text-sm px-5 py-2">
                      Modifier
                    </Button>
                  )}
                </div>
              ) : currentRace.can_predict ? (
                <Button 
                  onClick={() => navigate(`/predictions/${currentRace.id}`)} 
                  className="btn-racing w-full h-14 text-lg animate-neon"
                  data-testid="make-predictions-btn"
                >
                  <Target className="w-5 h-5 mr-2" />
                  FAIRE MES PRONOS
                </Button>
              ) : (
                <div className="text-center py-2">
                  <p className="font-body text-sm text-gray-500">Pronostics fermés</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* League Leaderboard - Dark Panel Style */}
        {league && leaderboard.length > 0 && (
          <div className="card-arcade overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600/20 to-transparent p-4 border-b border-yellow-500/30">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Mes Ligues
                </h3>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/league/${league.id}/chat`)} 
                    className="text-cyan-400 font-body text-xs hover:text-cyan-300 hover:bg-cyan-500/10 relative"
                    data-testid="league-chat-btn"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" /> Chat
                    {unreadChatByLeague[league.id] > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse">
                        {unreadChatByLeague[league.id] > 9 ? '9+' : unreadChatByLeague[league.id]}
                      </span>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/league")} 
                    className="text-green-400 font-body text-xs hover:text-green-300 hover:bg-green-500/10"
                    data-testid="add-league-btn"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/leaderboard")} 
                    className="text-cyan-400 font-body text-xs hover:text-cyan-300 hover:bg-cyan-500/10"
                  >
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Top 3 - Clickable members */}
            <div className="p-4 space-y-2">
              {leaderboard.map((entry, i) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div 
                    key={entry.user_id}
                    onClick={() => navigate(`/profile/${entry.user_id}`)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                      isMe 
                        ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg hover:bg-blue-500/30' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    data-testid={`leaderboard-member-${entry.user_id}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-heading text-lg ${
                      i === 0 ? 'position-1' : i === 1 ? 'position-2' : i === 2 ? 'position-3' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {i + 1}
                    </div>
                    <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                    <span className={`font-body text-sm flex-1 ${isMe ? 'text-white font-semibold' : 'text-gray-300'}`}>
                      {entry.username}
                      {isMe && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-yellow-500" />}
                    </span>
                    <span className="font-data text-sm text-cyan-400 font-semibold">
                      {entry.total_points} <span className="text-xs text-gray-500">pts</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {myPosition > 3 && (
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <span className="font-body text-sm text-gray-400">Ta position</span>
                  <span className="font-heading text-xl text-blue-400">#{myPosition}</span>
                </div>
              </div>
            )}

            <div className="h-2 bg-kerb-stripe" />
          </div>
        )}

        {/* No League CTA */}
        {!league && (
          <div className="card-gold p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-xl">
              <Users className="w-8 h-8 text-yellow-900" />
            </div>
            <h3 className="font-heading text-2xl text-yellow-800 uppercase mb-2">Rejoins une Ligue !</h3>
            <p className="font-body text-yellow-700 text-sm mb-5">
              Crée ou rejoins une ligue pour jouer avec tes amis
            </p>
            <Button onClick={() => navigate("/league")} className="btn-racing px-8 py-3">
              C'est parti !
            </Button>
          </div>
        )}

        {/* Help Admin Button */}
        <div 
          onClick={() => setShowFeedbackModal(true)}
          className="card-arcade p-4 cursor-pointer hover:ring-2 hover:ring-cyan-500/50 transition-all"
          data-testid="help-admin-card"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl flex items-center justify-center shadow-lg">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading text-sm text-white uppercase">Aider l'administrateur</h3>
              <p className="font-body text-xs text-gray-400">
                Signalez un bug, faites une suggestion ou partagez votre avis
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
}
