import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Zap, ChevronRight } from "lucide-react";
import { AvatarDisplay } from "../../components/AvatarDisplay";
import NotificationBell from "../../components/NotificationBell";
import FeedbackModal from "../../components/FeedbackModal";
import HamburgerMenu from "../../components/hamburger-menu/HamburgerMenu";
import RaceSlider from "./RaceSlider";
import { LeaguesList, NoLeagueCTA, HelpAdminCard } from "./LeaguesList";
import { useDashboardData } from "./useDashboardData";

const HERO_BANNER = "https://static.prod-images.emergentagent.com/jobs/2d0863ea-c0b4-4b63-a110-0f53de2a7c40/images/d9b6f1a65194f54bbc34bb7e15e4af8069ab64dab312c6c3be1db79b2ca45259.png";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { loading, upcomingRaces, avatars, userLeagues, unreadChatByLeague, predictions } = useDashboardData();

  const [currentRaceIndex, setCurrentRaceIndex] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [sprintCountdown, setSprintCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Countdown timer (stays as local state — not server data)
  useEffect(() => {
    const currentRace = upcomingRaces[currentRaceIndex];
    if (!currentRace?.predictions_close_at) return;
    const updateCountdown = () => {
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

  const getAvatarById = (avatarId) => avatars?.all?.find(a => a.id === avatarId) || null;

  const currentRace = upcomingRaces[currentRaceIndex];
  const currentPrediction = currentRace ? predictions[currentRace.id] : null;

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
      {/* Compact Profile Banner */}
      <div onClick={() => navigate("/profile")}
        className="relative z-20 bg-gradient-to-r from-[#0a1628] via-[#0c1a30] to-[#0a1628] cursor-pointer hover:from-[#0c1a30] hover:via-[#0f1f3a] hover:to-[#0c1a30] transition-all border-b border-cyan-500/20"
        data-testid="profile-banner">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarDisplay avatar={getAvatarById(user?.avatar_id)} customUrl={user?.custom_avatar_url} size="sm" />
            <div>
              <p className="font-heading text-sm text-white uppercase tracking-wide">{user?.username}</p>
              <div className="flex items-center gap-2">
                <span className="font-body text-[10px] text-white bg-gradient-to-r from-blue-600 to-blue-800 px-1.5 py-0.5 rounded-full shadow">Niv. {user?.level || 1}</span>
                <span className="font-data text-[10px] text-yellow-400 flex items-center gap-1"><Zap className="w-3 h-3 fill-yellow-500 text-yellow-400" /> {user?.xp || 0} XP</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userLeagues.length > 0 && (
              <div className="text-right hidden sm:block">
                <p className="font-body text-[9px] text-gray-500 uppercase tracking-wider">Ligue</p>
                <p className="font-heading text-xs text-cyan-400">{userLeagues.find(l => l.id === user?.current_league_id)?.name || userLeagues[0]?.name}</p>
              </div>
            )}
            <div className="flex items-center gap-1 bg-cyan-500/20 px-2 py-1 rounded-full">
              <span className="font-body text-xs text-cyan-400 uppercase tracking-wide">Profil</span>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full h-56 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between">
          <HamburgerMenu />
          <NotificationBell />
        </div>
        <img src={HERO_BANNER} alt="PRONOKIF" className="w-full h-full object-cover object-center" />
        <div className="absolute top-3 left-0 right-0 text-center z-10">
          <h1 className="font-heading text-3xl text-white tracking-wider uppercase" style={{textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)'}}>PRONOKIF</h1>
          <p className="font-body text-[10px] text-white tracking-[0.08em] font-medium mt-1" style={{textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)'}}>
            Pronostique 🔹 Défie tes amis 🔹 Domine le classement
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050a14] to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-2 space-y-4 relative z-10">
        <RaceSlider
          upcomingRaces={upcomingRaces}
          currentRaceIndex={currentRaceIndex}
          setCurrentRaceIndex={setCurrentRaceIndex}
          currentRace={currentRace}
          currentPrediction={currentPrediction}
          countdown={countdown}
          sprintCountdown={sprintCountdown}
        />

        {userLeagues.length > 0 ? (
          <LeaguesList userLeagues={userLeagues} user={user} unreadChatByLeague={unreadChatByLeague} />
        ) : (
          <NoLeagueCTA />
        )}

        <HelpAdminCard onClick={() => setShowFeedbackModal(true)} />
      </div>

      <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
    </div>
  );
}
