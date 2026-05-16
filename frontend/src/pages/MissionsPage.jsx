import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { 
  ChevronLeft, Trophy, Target, Users, Gamepad2, Check, Lock,
  Star, Crown, Medal, Zap, Flag, Calendar, Eye, AlertTriangle, Timer
} from "lucide-react";

const ICON_MAP = {
  target: Target,
  trophy: Trophy,
  crown: Crown,
  calendar: Calendar,
  flag: Flag,
  zap: Zap,
  medal: Medal,
  check: Check,
  eye: Eye,
  "alert-triangle": AlertTriangle,
  "x-circle": AlertTriangle,
  "corner-down-right": Flag,
  "plus-circle": Zap,
  edit: Target,
  users: Users,
};

export default function MissionsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [categories, setCategories] = useState({});
  const [activeCategory, setActiveCategory] = useState("assiduity");
  const [stats, setStats] = useState(null);
  const [claiming, setClaiming] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [missionsRes, statsRes] = await Promise.all([
        apiClient.get("/user/missions"),
        apiClient.get("/user/stats")
      ]);

      setMissions(missionsRes.data.missions);
      setCategories(missionsRes.data.categories);
      setStats(statsRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClaimMission = async (missionId) => {
    setClaiming(missionId);
    try {
      const res = await apiClient.post(`/user/missions/${missionId}/claim`);
      toast.success(`+${res.data.xp_earned} XP !`);
      
      if (res.data.level_up) {
        toast.success(`Niveau ${res.data.new_level} atteint !`, { icon: "🎉" });
      }
      
      // Update user data
      if (updateUser) {
        updateUser({ xp: res.data.new_xp, level: res.data.new_level });
      }
      
      // Refresh missions
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    } finally {
      setClaiming(null);
    }
  };

  const categoryTabs = [
    { id: "assiduity", label: "Assiduité", icon: Calendar, color: "text-green-400" },
    { id: "performance", label: "Performance", icon: Trophy, color: "text-yellow-400" },
    { id: "social", label: "Social", icon: Users, color: "text-blue-400" },
    { id: "minigames", label: "Mini-jeux", icon: Gamepad2, color: "text-purple-400" },
  ];

  const getProgressColor = (progress) => {
    const ratio = progress.current / progress.target;
    if (ratio >= 1) return "bg-green-500";
    if (ratio >= 0.5) return "bg-yellow-500";
    return "bg-orange-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-arcade rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton-arcade rounded-md" />)}
          </div>
        </div>
      </div>
    );
  }

  const currentMissions = categories[activeCategory] || [];
  const completedCount = currentMissions.filter(m => m.completed).length;
  const claimableCount = currentMissions.filter(m => m.completed && !m.claimed).length;

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="missions-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-yellow-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white hover:bg-white/10">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Missions
              </h1>
              <p className="font-body text-xs text-gray-400">
                Complète des missions pour gagner de l'XP
              </p>
            </div>
            {user && (
              <div className="text-right">
                <p className="font-heading text-sm text-cyan-400">Niveau {user.level}</p>
                <p className="font-data text-xs text-gray-400">{user.xp} XP</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categoryTabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeCategory === tab.id;
            const categoryMissions = categories[tab.id] || [];
            const completed = categoryMissions.filter(m => m.completed).length;
            const claimable = categoryMissions.filter(m => m.completed && !m.claimed).length;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all relative ${
                  isActive 
                    ? "border-orange-500 bg-orange-500/20" 
                    : "border-gray-700 bg-gray-900/50 hover:border-gray-600"
                }`}
              >
                <TabIcon className={`w-5 h-5 mx-auto mb-1 ${isActive ? tab.color : "text-gray-500"}`} />
                <p className={`font-heading text-xs uppercase ${isActive ? "text-white" : "text-gray-400"}`}>
                  {tab.label}
                </p>
                <p className="font-data text-[10px] text-gray-500">
                  {completed}/{categoryMissions.length}
                </p>
                {claimable > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="font-heading text-[10px] text-white">{claimable}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Stats Summary */}
        {stats && (
          <Card className="bg-gray-800/30 border-gray-700">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="font-data text-xl text-orange-400">{stats.predictions_made}</p>
                  <p className="font-body text-[10px] text-gray-500 uppercase">Pronos</p>
                </div>
                <div>
                  <p className="font-data text-xl text-green-400">{stats.predictions_correct}</p>
                  <p className="font-body text-[10px] text-gray-500 uppercase">Réussis</p>
                </div>
                <div>
                  <p className="font-data text-xl text-yellow-400">{stats.winners_correct}</p>
                  <p className="font-body text-[10px] text-gray-500 uppercase">Winners</p>
                </div>
                <div>
                  <p className="font-data text-xl text-cyan-400">{stats.poles_correct}</p>
                  <p className="font-body text-[10px] text-gray-500 uppercase">Poles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Progress */}
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-sm uppercase text-gray-400">
            {categoryTabs.find(t => t.id === activeCategory)?.label}
          </h2>
          <p className="font-body text-sm text-gray-500">
            {completedCount}/{currentMissions.length} complétées
            {claimableCount > 0 && (
              <span className="text-green-400 ml-2">({claimableCount} à réclamer)</span>
            )}
          </p>
        </div>

        {/* Missions Grid */}
        <div className="space-y-3">
          {currentMissions.map((mission) => {
            const MissionIcon = ICON_MAP[mission.icon] || Star;
            const progress = (mission.current / mission.target) * 100;
            const canClaim = mission.completed && !mission.claimed;

            return (
              <Card 
                key={mission.mission_id}
                className={`game-card overflow-hidden transition-all ${
                  mission.claimed 
                    ? "opacity-60 border-gray-700" 
                    : canClaim 
                      ? "border-green-500/50 glow-green"
                      : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      mission.claimed 
                        ? "bg-green-500/20 border border-green-500/50"
                        : mission.completed
                          ? "bg-yellow-500/20 border border-yellow-500/50"
                          : "bg-gray-800 border border-gray-700"
                    }`}>
                      {mission.claimed ? (
                        <Check className="w-6 h-6 text-green-500" />
                      ) : (
                        <MissionIcon className={`w-6 h-6 ${
                          mission.completed ? "text-yellow-500" : "text-gray-500"
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`font-heading text-sm uppercase ${
                            mission.claimed ? "text-gray-400" : "text-white"
                          }`}>
                            {mission.name}
                          </h3>
                          <p className="font-body text-xs text-gray-500 mt-0.5">
                            {mission.description}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-data text-sm text-yellow-500">
                            +{mission.xp_reward} XP
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-data text-xs text-gray-400">
                            {mission.current} / {mission.target}
                          </p>
                          <p className="font-data text-xs text-gray-500">
                            {Math.min(100, Math.round(progress))}%
                          </p>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              mission.claimed 
                                ? "bg-green-500" 
                                : mission.completed 
                                  ? "bg-yellow-500" 
                                  : "bg-orange-500"
                            }`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </div>

                      {/* Claim button */}
                      {canClaim && (
                        <Button
                          onClick={() => handleClaimMission(mission.mission_id)}
                          disabled={claiming === mission.mission_id}
                          className="mt-3 w-full btn-gaming h-10"
                        >
                          {claiming === mission.mission_id ? (
                            "Réclamation..."
                          ) : (
                            <>
                              <Trophy className="w-4 h-4 mr-2" />
                              Réclamer +{mission.xp_reward} XP
                            </>
                          )}
                        </Button>
                      )}

                      {mission.claimed && (
                        <p className="font-body text-xs text-green-500 mt-2 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Réclamée
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
