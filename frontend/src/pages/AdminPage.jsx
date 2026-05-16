import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { 
  ChevronLeft, Check, Flag, Trophy, Shield, Calendar,
  AlertTriangle, Timer, Save, Loader2, Target, Users, X, Zap, RefreshCw,
  Bell, Send, MessageSquare, Bug, Lightbulb, Info, Eye, EyeOff, Medal,
  Trash2, History, Globe, Monitor
} from "lucide-react";

const TEAM_COLORS = {
  "Red Bull Racing": "#3671C6",
  "Ferrari": "#F91536",
  "McLaren": "#FF8000",
  "Mercedes": "#27F4D2",
  "Aston Martin": "#229971",
  "Alpine": "#0093CC",
  "Williams": "#64C4FF",
  "RB": "#6692FF",
  "Sauber": "#52E252",
  "Haas": "#B6BABD",
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Results state - Now Top 10
  const [qualiPole, setQualiPole] = useState(null);
  const [qualiTop10, setQualiTop10] = useState([]);
  const [sprintQualiPole, setSprintQualiPole] = useState(null);
  const [sprintQualiTop10, setSprintQualiTop10] = useState([]);
  const [sprintRaceWinner, setSprintRaceWinner] = useState(null);
  const [sprintRaceTop10, setSprintRaceTop10] = useState([]);
  const [raceWinner, setRaceWinner] = useState(null);
  const [raceTop10, setRaceTop10] = useState([]);
  
  // Bonus results
  const [safetyCar, setSafetyCar] = useState(false);
  const [dnfDrivers, setDnfDrivers] = useState([]);
  const [fastestLap, setFastestLap] = useState(null);
  const [firstCornerLeader, setFirstCornerLeader] = useState(null);
  
  const [selectionMode, setSelectionMode] = useState("quali_pole");
  
  // Admin panel tabs
  const [adminTab, setAdminTab] = useState("results"); // results, notifications, feedback, members
  
  // Notifications state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [sendingNotif, setSendingNotif] = useState(false);
  
  // Feedback state
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  
  // Members state
  const [membersList, setMembersList] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false);
  const [memberActivity, setMemberActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);
  const [memberDetailTab, setMemberDetailTab] = useState("info"); // info, activity

  const fetchData = useCallback(async () => {
    try {
      const [racesRes, driversRes] = await Promise.all([
        apiClient.get("/admin/races"),
        apiClient.get("/drivers")
      ]);
      
      setRaces(racesRes.data);
      setDrivers(driversRes.data);
      setIsAdmin(true);
      
      // Select first race without results that is past
      const pastRaceWithoutResults = racesRes.data.find(r => r.is_past && !r.has_results);
      if (pastRaceWithoutResults) {
        await selectRace(pastRaceWithoutResults);
      }
    } catch (e) {
      if (e.response?.status === 403) {
        setIsAdmin(false);
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch feedback when on feedback tab
  useEffect(() => {
    if (adminTab === "feedback" && isAdmin && feedbackList.length === 0) {
      fetchFeedback();
    }
  }, [adminTab, isAdmin]);

  // Fetch members when on members tab
  useEffect(() => {
    if (adminTab === "members" && isAdmin && membersList.length === 0) {
      fetchMembers();
    }
  }, [adminTab, isAdmin]);

  const fetchFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const res = await apiClient.get("/admin/feedback");
      setFeedbackList(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await apiClient.get("/admin/members");
      setMembersList(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchMemberDetails = async (memberId) => {
    setLoadingMemberDetails(true);
    setMemberDetailTab("info"); // Reset to info tab
    setMemberActivity(null); // Reset activity
    try {
      const res = await apiClient.get(`/admin/members/${memberId}`);
      setMemberDetails(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoadingMemberDetails(false);
    }
  };

  const fetchMemberActivity = async (memberId) => {
    setLoadingActivity(true);
    try {
      const res = await apiClient.get(`/admin/members/${memberId}/activity`);
      setMemberActivity(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement de l'activité");
    } finally {
      setLoadingActivity(false);
    }
  };

  const deleteMember = async (memberId) => {
    setDeletingMember(true);
    try {
      await apiClient.delete(`/admin/members/${memberId}`);
      toast.success("Membre supprimé avec succès");
      setSelectedMember(null);
      setMemberDetails(null);
      setShowDeleteConfirm(false);
      // Refresh members list
      fetchMembers();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeletingMember(false);
    }
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error("Remplissez le titre et le message");
      return;
    }
    
    setSendingNotif(true);
    try {
      await apiClient.post("/admin/notifications", {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType
      });
      toast.success("Notification envoyée à tous les membres !");
      setNotifTitle("");
      setNotifMessage("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSendingNotif(false);
    }
  };

  const markFeedbackRead = async (feedbackId) => {
    try {
      await apiClient.put(`/admin/feedback/${feedbackId}/read`);
      setFeedbackList(prev => 
        prev.map(f => f.id === feedbackId ? { ...f, read: true } : f)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const selectRace = async (race) => {
    setSelectedRace(race);
    resetForm();
    
    // Load existing results if any
    if (race.has_results) {
      try {
        const res = await apiClient.get(`/admin/results/${race.id}`);
        if (res.data?.results) {
          const r = res.data.results;
          setQualiPole(r.quali_pole);
          setQualiTop10(r.quali_top10 || []);
          setSprintQualiPole(r.sprint_quali_pole || null);
          setSprintQualiTop10(r.sprint_quali_top10 || []);
          setSprintRaceWinner(r.sprint_race_winner || null);
          setSprintRaceTop10(r.sprint_race_top10 || []);
          setRaceWinner(r.race_winner);
          setRaceTop10(r.race_top10 || []);
          setSafetyCar(r.bonus?.safety_car || false);
          setDnfDrivers(r.bonus?.dnf_drivers || []);
          setFastestLap(r.bonus?.fastest_lap || null);
          setFirstCornerLeader(r.bonus?.first_corner_leader || null);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const resetForm = () => {
    setQualiPole(null);
    setQualiTop10([]);
    setSprintQualiTop10([]);
    setSprintRaceTop10([]);
    setRaceWinner(null);
    setRaceTop10([]);
    setSafetyCar(false);
    setDnfDrivers([]);
    setFastestLap(null);
    setFirstCornerLeader(null);
    setSelectionMode("quali_pole");
  };

  const handleDriverSelect = (driverId) => {
    switch (selectionMode) {
      case "quali_pole":
        setQualiPole(driverId);
        break;
      case "quali_top10":
        if (qualiTop10.includes(driverId)) {
          setQualiTop10(qualiTop10.filter(d => d !== driverId));
        } else if (qualiTop10.length < 10) {
          setQualiTop10([...qualiTop10, driverId]);
        }
        break;
      case "sprint_quali_pole":
        setSprintQualiPole(driverId);
        break;
      case "sprint_quali_top10":
        if (sprintQualiTop10.includes(driverId)) {
          setSprintQualiTop10(sprintQualiTop10.filter(d => d !== driverId));
        } else if (sprintQualiTop10.length < 10) {
          setSprintQualiTop10([...sprintQualiTop10, driverId]);
        }
        break;
      case "sprint_race_winner":
        setSprintRaceWinner(driverId);
        break;
      case "sprint_race_top10":
        if (sprintRaceTop10.includes(driverId)) {
          setSprintRaceTop10(sprintRaceTop10.filter(d => d !== driverId));
        } else if (sprintRaceTop10.length < 10) {
          setSprintRaceTop10([...sprintRaceTop10, driverId]);
        }
        break;
      case "race_winner":
        setRaceWinner(driverId);
        break;
      case "race_top10":
        if (raceTop10.includes(driverId)) {
          setRaceTop10(raceTop10.filter(d => d !== driverId));
        } else if (raceTop10.length < 10) {
          setRaceTop10([...raceTop10, driverId]);
        }
        break;
      case "fastest_lap":
        setFastestLap(driverId === fastestLap ? null : driverId);
        break;
      case "first_corner":
        setFirstCornerLeader(driverId === firstCornerLeader ? null : driverId);
        break;
      case "dnf_select":
        if (dnfDrivers.includes(driverId)) {
          setDnfDrivers(dnfDrivers.filter(d => d !== driverId));
        } else {
          setDnfDrivers([...dnfDrivers, driverId]);
        }
        break;
      default:
        break;
    }
  };

  const isDriverSelected = (driverId) => {
    switch (selectionMode) {
      case "quali_pole": return qualiPole === driverId;
      case "quali_top10": return qualiTop10.includes(driverId);
      case "sprint_quali_pole": return sprintQualiPole === driverId;
      case "sprint_quali_top10": return sprintQualiTop10.includes(driverId);
      case "sprint_race_winner": return sprintRaceWinner === driverId;
      case "sprint_race_top10": return sprintRaceTop10.includes(driverId);
      case "race_winner": return raceWinner === driverId;
      case "race_top10": return raceTop10.includes(driverId);
      case "fastest_lap": return fastestLap === driverId;
      case "first_corner": return firstCornerLeader === driverId;
      case "dnf_select": return dnfDrivers.includes(driverId);
      default: return false;
    }
  };

  const getDriverPosition = (driverId) => {
    if (selectionMode === "quali_top10") return qualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_quali_top10") return sprintQualiTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "sprint_race_top10") return sprintRaceTop10.indexOf(driverId) + 1 || null;
    if (selectionMode === "race_top10") return raceTop10.indexOf(driverId) + 1 || null;
    return null;
  };

  const isSprintComplete = !selectedRace?.is_sprint || (
    sprintQualiPole && 
    sprintQualiTop10.length === 10 && 
    sprintRaceWinner && 
    sprintRaceTop10.length === 10
  );
  const isComplete = qualiPole && qualiTop10.length === 10 && raceWinner && raceTop10.length === 10 && isSprintComplete;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error("Complete tous les résultats obligatoires");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        quali_pole: qualiPole,
        quali_top10: qualiTop10,
        race_winner: raceWinner,
        race_top10: raceTop10,
        safety_car: safetyCar,
        dnf_drivers: dnfDrivers,
        fastest_lap: fastestLap,
        first_corner_leader: firstCornerLeader
      };

      // Add sprint results if sprint weekend
      if (selectedRace.is_sprint) {
        payload.sprint_quali_pole = sprintQualiPole;
        payload.sprint_quali_top10 = sprintQualiTop10;
        payload.sprint_race_winner = sprintRaceWinner;
        payload.sprint_race_top10 = sprintRaceTop10;
      }

      await apiClient.post(`/admin/results/${selectedRace.id}`, payload);
      toast.success("Résultats enregistrés ! Les points ont été calculés.");
      
      // Refresh races
      const racesRes = await apiClient.get("/admin/races");
      setRaces(racesRes.data);
      
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de l'enregistrement";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncOpenF1 = async () => {
    if (!selectedRace) return;
    
    setSyncing(true);
    try {
      const res = await apiClient.post(`/admin/sync-results/${selectedRace.id}`);
      
      if (res.data.status === "success" || res.data.status === "partial") {
        const fetched = res.data.fetched_data;
        
        // Qualifying results
        if (fetched.quali_pole) setQualiPole(fetched.quali_pole);
        if (fetched.quali_top10?.length) setQualiTop10(fetched.quali_top10);
        
        // Sprint results (if applicable)
        if (fetched.sprint_quali_pole) setSprintQualiPole(fetched.sprint_quali_pole);
        if (fetched.sprint_quali_top10?.length) setSprintQualiTop10(fetched.sprint_quali_top10);
        if (fetched.sprint_race_winner) setSprintRaceWinner(fetched.sprint_race_winner);
        if (fetched.sprint_race_top10?.length) setSprintRaceTop10(fetched.sprint_race_top10);
        
        // Race results
        if (fetched.race_winner) setRaceWinner(fetched.race_winner);
        if (fetched.race_top10?.length) setRaceTop10(fetched.race_top10);
        
        // Bonus data
        if (fetched.bonus) {
          if (fetched.bonus.safety_car !== null && fetched.bonus.safety_car !== undefined) {
            setSafetyCar(fetched.bonus.safety_car);
          }
          if (fetched.bonus.dnf_drivers?.length) {
            setDnfDrivers(fetched.bonus.dnf_drivers);
          }
          if (fetched.bonus.fastest_lap) {
            setFastestLap(fetched.bonus.fastest_lap);
          }
          if (fetched.bonus.first_corner_leader) {
            setFirstCornerLeader(fetched.bonus.first_corner_leader);
          }
        }
        
        // Show success message with details
        const successItems = res.data.success_items || [];
        if (successItems.length > 0) {
          toast.success(`Données récupérées automatiquement !\n${successItems.join(', ')}`, { duration: 5000 });
        } else {
          toast.warning("Aucune donnée disponible via l'API. Saisie manuelle requise.");
        }
        
        // Show errors if any
        if (res.data.errors?.length > 0) {
          console.log("Sync errors:", res.data.errors);
        }
      } else {
        toast.warning(res.data.message || "Données non disponibles, saisie manuelle requise.");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erreur lors de la synchronisation avec les APIs");
    } finally {
      setSyncing(false);
    }
  };

  // Selection steps
  const getSelectionSteps = () => {
    const steps = [];

    // Add sprint steps FIRST if it's a sprint weekend (Sprint happens before main quali/race)
    if (selectedRace?.is_sprint) {
      steps.push(
        { key: "sprint_quali_pole", label: "Pole SQ", icon: Flag, done: !!sprintQualiPole, count: sprintQualiPole ? 1 : 0, max: 1, isSprint: true },
        { key: "sprint_quali_top10", label: "Top10 SQ", icon: Medal, done: sprintQualiTop10.length === 10, count: sprintQualiTop10.length, max: 10, isSprint: true },
        { key: "sprint_race_winner", label: "Win SR", icon: Trophy, done: !!sprintRaceWinner, count: sprintRaceWinner ? 1 : 0, max: 1, isSprint: true },
        { key: "sprint_race_top10", label: "Top10 SR", icon: Medal, done: sprintRaceTop10.length === 10, count: sprintRaceTop10.length, max: 10, isSprint: true }
      );
    }

    // Main qualifying and race
    steps.push(
      { key: "quali_pole", label: "Pole", icon: Flag, done: !!qualiPole, count: qualiPole ? 1 : 0, max: 1 },
      { key: "quali_top10", label: "Top 10 Q", icon: Trophy, done: qualiTop10.length === 10, count: qualiTop10.length, max: 10 },
      { key: "race_winner", label: "Winner", icon: Trophy, done: !!raceWinner, count: raceWinner ? 1 : 0, max: 1 },
      { key: "race_top10", label: "Top 10 R", icon: Trophy, done: raceTop10.length === 10, count: raceTop10.length, max: 10 },
      { key: "bonus", label: "Bonus", icon: Zap, done: true, count: 0, max: 0, isBonus: true }
    );

    return steps;
  };

  const selectionSteps = getSelectionSteps();
  const showBonus = ["bonus", "fastest_lap", "first_corner", "dnf_select"].includes(selectionMode);

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="card-arcade p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="font-heading text-2xl uppercase text-white mb-2">Accès Refusé</h2>
            <p className="font-body text-gray-400 mb-6">
              Seuls les créateurs de ligue peuvent accéder à cette page.
            </p>
            <Button onClick={() => navigate("/")} className="btn-racing">
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main" data-testid="admin-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-red-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white hover:bg-white/10">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Administration
              </h1>
              <p className="font-body text-xs text-gray-400">Entrer les résultats officiels</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Admin Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <button
            onClick={() => setAdminTab("results")}
            className={`p-3 rounded-xl font-heading text-xs uppercase transition-all ${
              adminTab === "results" 
                ? 'bg-red-500/20 border-2 border-red-500 text-red-400' 
                : 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Trophy className="w-5 h-5 mx-auto mb-1" />
            Résultats
          </button>
          <button
            onClick={() => setAdminTab("notifications")}
            className={`p-3 rounded-xl font-heading text-xs uppercase transition-all ${
              adminTab === "notifications" 
                ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400' 
                : 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Bell className="w-5 h-5 mx-auto mb-1" />
            Notifs
          </button>
          <button
            onClick={() => setAdminTab("feedback")}
            className={`p-3 rounded-xl font-heading text-xs uppercase relative transition-all ${
              adminTab === "feedback" 
                ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400' 
                : 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-5 h-5 mx-auto mb-1" />
            Feedback
            {feedbackList.filter(f => !f.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {feedbackList.filter(f => !f.read).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab("members")}
            className={`p-3 rounded-xl font-heading text-xs uppercase transition-all ${
              adminTab === "members" 
                ? 'bg-green-500/20 border-2 border-green-500 text-green-400' 
                : 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5 mx-auto mb-1" />
            Membres
          </button>
        </div>

        {/* Members Panel */}
        {adminTab === "members" && (
          <div className="space-y-4">
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && memberDetails && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-md card-arcade overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/30">
                    <h3 className="font-heading text-sm uppercase text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Confirmer la suppression
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <p className="font-body text-gray-300">
                      Êtes-vous sûr de vouloir supprimer le compte de <span className="text-white font-semibold">{memberDetails.username || memberDetails.email}</span> ?
                    </p>
                    <p className="font-body text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
                      ⚠️ Cette action est irréversible. Toutes les données de ce membre seront supprimées : pronostics, scores, statistiques, etc.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowDeleteConfirm(false)}
                        variant="outline"
                        className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                        disabled={deletingMember}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={() => deleteMember(selectedMember)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        disabled={deletingMember}
                        data-testid="confirm-delete-member-btn"
                      >
                        {deletingMember ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...</>
                        ) : (
                          <><Trash2 className="w-4 h-4 mr-2" /> Supprimer</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Member Details Modal */}
            {selectedMember && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="w-full max-w-lg card-arcade overflow-hidden max-h-[85vh] flex flex-col">
                  <div className="bg-gradient-to-r from-green-600/20 to-transparent px-4 py-3 border-b border-gray-700/50 flex items-center justify-between sticky top-0 bg-[#0c1525] z-10">
                    <h3 className="font-heading text-sm uppercase text-green-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Détails du membre
                    </h3>
                    <button onClick={() => { setSelectedMember(null); setMemberDetails(null); setMemberActivity(null); setShowDeleteConfirm(false); }} className="text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {loadingMemberDetails ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto" />
                    </div>
                  ) : memberDetails && (
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-4 space-y-4">
                        {/* Basic Info Header */}
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-heading text-xl">
                            {memberDetails.username?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-heading text-lg text-white">{memberDetails.username || "Sans pseudo"}</h4>
                            <p className="font-body text-sm text-gray-400">{memberDetails.email}</p>
                            <p className="font-body text-xs text-gray-500">
                              Inscrit le {new Date(memberDetails.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        
                        {/* Tab Selector */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setMemberDetailTab("info")}
                            className={`flex-1 p-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                              memberDetailTab === "info"
                                ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                                : 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <Info className="w-4 h-4" />
                            Infos
                          </button>
                          <button
                            onClick={() => {
                              setMemberDetailTab("activity");
                              if (!memberActivity) {
                                fetchMemberActivity(selectedMember);
                              }
                            }}
                            className={`flex-1 p-2 rounded-lg font-heading text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                              memberDetailTab === "activity"
                                ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400'
                                : 'bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            <History className="w-4 h-4" />
                            Activité
                          </button>
                        </div>
                        
                        {/* Info Tab Content */}
                        {memberDetailTab === "info" && (
                          <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="font-data text-xl text-cyan-400">{memberDetails.level}</p>
                                <p className="font-body text-xs text-gray-500">Niveau</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="font-data text-xl text-yellow-400">{memberDetails.xp}</p>
                                <p className="font-body text-xs text-gray-500">XP</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="font-data text-xl text-green-400">{memberDetails.stats?.predictions_count || 0}</p>
                                <p className="font-body text-xs text-gray-500">Pronostics</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 text-center">
                                <p className="font-data text-xl text-purple-400">{memberDetails.leagues?.length || 0}</p>
                                <p className="font-body text-xs text-gray-500">Ligues</p>
                              </div>
                            </div>
                            
                            {/* Performance Stats */}
                            <div className="bg-white/5 rounded-lg p-3">
                              <h5 className="font-heading text-xs text-gray-400 uppercase mb-2">Performance</h5>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Poles exactes:</span>
                                  <span className="text-white">{memberDetails.stats?.correct_poles || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Winners exacts:</span>
                                  <span className="text-white">{memberDetails.stats?.correct_winners || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Top 10 parfaits:</span>
                                  <span className="text-white">{memberDetails.stats?.perfect_top10 || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Courses:</span>
                                  <span className="text-white">{memberDetails.stats?.races_participated || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Leagues */}
                            {memberDetails.leagues?.length > 0 && (
                              <div className="bg-white/5 rounded-lg p-3">
                                <h5 className="font-heading text-xs text-gray-400 uppercase mb-2">Ligues</h5>
                                <div className="space-y-1">
                                  {memberDetails.leagues.map(league => (
                                    <div key={league.id} className="flex justify-between text-sm">
                                      <span className="text-white">{league.name}</span>
                                      <span className="text-gray-500">{league.members_count} membres</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Activity Tab Content */}
                        {memberDetailTab === "activity" && (
                          <div className="space-y-3">
                            {loadingActivity ? (
                              <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mx-auto" />
                                <p className="font-body text-sm text-gray-500 mt-2">Chargement de l'historique...</p>
                              </div>
                            ) : memberActivity?.sessions?.length > 0 ? (
                              <>
                                <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/30">
                                  <p className="font-body text-sm text-cyan-400">
                                    <History className="w-4 h-4 inline mr-2" />
                                    {memberActivity.sessions.length} connexion(s) enregistrée(s)
                                  </p>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {memberActivity.sessions.map((session, index) => (
                                    <div 
                                      key={session.id || index} 
                                      className="bg-white/5 rounded-lg p-3 border border-gray-700/50"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-body text-sm text-white">
                                          {new Date(session.login_at).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </span>
                                        {index === 0 && (
                                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-body">
                                            Dernière
                                          </span>
                                        )}
                                      </div>
                                      <div className="space-y-1 text-xs">
                                        <div className="flex items-center gap-2 text-gray-400">
                                          <Globe className="w-3 h-3" />
                                          <span className="font-mono">{session.ip_address || "IP non enregistrée"}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-gray-500">
                                          <Monitor className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                          <span className="font-mono text-[10px] break-all line-clamp-2">
                                            {session.user_agent || "User agent non enregistré"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="p-8 text-center bg-white/5 rounded-lg">
                                <History className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                                <p className="font-body text-gray-500">Aucun historique de connexion</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Delete Button */}
                        <div className="pt-4 border-t border-gray-700/50">
                          <Button
                            onClick={() => setShowDeleteConfirm(true)}
                            variant="outline"
                            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500"
                            data-testid="delete-member-btn"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer ce compte
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Members List */}
            <div className="card-arcade overflow-hidden">
              <div className="bg-gradient-to-r from-green-600/20 to-transparent px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                <h3 className="font-heading text-sm uppercase text-green-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Membres inscrits
                  <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-data">
                    {membersList.length}
                  </span>
                </h3>
                <button onClick={fetchMembers} className="text-gray-400 hover:text-white">
                  <RefreshCw className={`w-4 h-4 ${loadingMembers ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {loadingMembers ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto" />
                </div>
              ) : membersList.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="font-body text-gray-500">Aucun membre inscrit</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
                  {membersList.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => { setSelectedMember(member.id); fetchMemberDetails(member.id); }}
                      className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center text-white font-heading text-sm">
                        {member.username?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-white truncate">{member.username || "Sans pseudo"}</p>
                        <p className="font-body text-xs text-gray-500 truncate">{member.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-data text-sm text-cyan-400">Niv. {member.level || 1}</p>
                        <p className="font-body text-xs text-gray-500">{member.predictions_count || 0} pronos</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Panel */}
        {adminTab === "notifications" && (
          <div className="space-y-4">
            <div className="card-arcade overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-600/20 to-transparent px-4 py-3 border-b border-gray-700/50">
                <h3 className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Envoyer une notification
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Notification Type */}
                <div>
                  <Label className="font-body text-sm text-gray-400 mb-2 block">Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "info", label: "Info", icon: Info, color: "blue" },
                      { id: "update", label: "Mise à jour", icon: Zap, color: "green" },
                      { id: "important", label: "Important", icon: AlertTriangle, color: "yellow" }
                    ].map((type) => {
                      const Icon = type.icon;
                      const isSelected = notifType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setNotifType(type.id)}
                          className={`p-3 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? `bg-${type.color}-500/20 border-${type.color}-500 text-${type.color}-400` 
                              : 'bg-white/5 border-gray-700 text-gray-400 hover:bg-white/10'
                          }`}
                          style={isSelected ? { 
                            backgroundColor: type.color === 'blue' ? 'rgba(59,130,246,0.2)' : 
                                           type.color === 'green' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                            borderColor: type.color === 'blue' ? '#3b82f6' : 
                                        type.color === 'green' ? '#22c55e' : '#eab308'
                          } : {}}
                        >
                          <Icon className={`w-5 h-5 mx-auto mb-1`} 
                                style={{ color: isSelected ? (type.color === 'blue' ? '#60a5fa' : type.color === 'green' ? '#4ade80' : '#facc15') : undefined }} />
                          <p className="font-body text-xs">{type.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label className="font-body text-sm text-gray-400 mb-2 block">Titre</Label>
                  <Input
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Ex: Nouvelle fonctionnalité disponible !"
                    maxLength={100}
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>

                {/* Message */}
                <div>
                  <Label className="font-body text-sm text-gray-400 mb-2 block">
                    Message
                    <span className="text-gray-600 ml-2">({notifMessage.length}/5000)</span>
                  </Label>
                  <Textarea
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Détaillez votre message..."
                    rows={8}
                    maxLength={5000}
                    className="bg-gray-900 border-gray-700 text-white resize-none"
                  />
                </div>

                {/* Send Button */}
                <Button
                  onClick={sendNotification}
                  disabled={!notifTitle.trim() || !notifMessage.trim() || sendingNotif}
                  className="btn-racing w-full h-12"
                >
                  {sendingNotif ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><Send className="w-5 h-5 mr-2" /> Envoyer à tous les membres</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Panel */}
        {adminTab === "feedback" && (
          <div className="space-y-4">
            <div className="card-arcade overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-600/20 to-transparent px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                <h3 className="font-heading text-sm uppercase text-yellow-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Messages des utilisateurs
                </h3>
                <button onClick={fetchFeedback} className="text-gray-400 hover:text-white">
                  <RefreshCw className={`w-4 h-4 ${loadingFeedback ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {loadingFeedback ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 text-yellow-500 animate-spin mx-auto" />
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="font-body text-gray-500">Aucun feedback pour le moment</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {feedbackList.map((feedback) => {
                    const categoryConfig = {
                      bug: { icon: Bug, color: "text-red-400", bg: "bg-red-500/20", label: "Bug" },
                      suggestion: { icon: Lightbulb, color: "text-yellow-400", bg: "bg-yellow-500/20", label: "Suggestion" },
                      feedback: { icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/20", label: "Feedback" }
                    };
                    const config = categoryConfig[feedback.category] || categoryConfig.feedback;
                    const Icon = config.icon;
                    
                    return (
                      <div 
                        key={feedback.id}
                        className={`p-4 ${!feedback.read ? 'bg-yellow-500/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-body text-sm text-white font-semibold">{feedback.username}</span>
                              <span className={`font-body text-xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                                {config.label}
                              </span>
                              {!feedback.read && (
                                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                              )}
                            </div>
                            <p className="font-body text-sm text-gray-400 whitespace-pre-wrap">{feedback.message}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-body text-[10px] text-gray-600">
                                {new Date(feedback.created_at).toLocaleDateString('fr-FR', { 
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                })}
                              </span>
                              {!feedback.read && (
                                <button
                                  onClick={() => markFeedbackRead(feedback.id)}
                                  className="font-body text-xs text-cyan-400 hover:text-cyan-300"
                                >
                                  Marquer comme lu
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Panel (Original Content) */}
        {adminTab === "results" && (
          <>
        {/* Race Selector */}
        <div className="card-arcade mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-600/20 to-transparent px-4 py-3 border-b border-gray-700/50">
            <h3 className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Sélectionner une course
            </h3>
          </div>
          <div className="p-3">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {races.filter(r => r.is_past).map((race) => (
                <Button
                  key={race.id}
                  variant={selectedRace?.id === race.id ? "default" : "outline"}
                  onClick={() => selectRace(race)}
                  className={`flex-shrink-0 text-xs ${
                    selectedRace?.id === race.id 
                      ? 'btn-racing' 
                      : race.has_results 
                        ? 'border-green-500/50 text-green-400' 
                        : 'border-gray-700 text-gray-300'
                  }`}
                >
                  {race.name.replace(" Grand Prix", "")}
                  {race.has_results && <Check className="w-3 h-3 ml-1" />}
                  {race.is_sprint && <Zap className="w-3 h-3 ml-1 text-purple-400" />}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {selectedRace && (
          <>
            {/* Race Info */}
            <Card className="game-card mb-4">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading text-lg uppercase text-white flex items-center gap-2">
                      {selectedRace.name}
                      {selectedRace.is_sprint && (
                        <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 text-xs font-heading uppercase">
                          Sprint
                        </span>
                      )}
                    </h2>
                    <p className="font-body text-sm text-gray-400">{selectedRace.date}</p>
                    {selectedRace.has_results && (
                      <p className="font-body text-xs text-green-400 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Résultats déjà enregistrés (modification possible)
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSyncOpenF1}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                  >
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span className="ml-1 text-xs">OpenF1</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selection Steps */}
            <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
              {selectionSteps.map((step) => {
                const Icon = step.icon;
                const isActive = selectionMode === step.key || (step.key === "bonus" && showBonus);
                
                return (
                  <button
                    key={step.key}
                    onClick={() => setSelectionMode(step.key)}
                    className={`flex-1 min-w-[55px] p-2 rounded-lg border-2 transition-all ${
                      isActive 
                        ? step.isBonus 
                          ? 'border-yellow-500 bg-yellow-500/20 glow-yellow' 
                          : step.isSprint
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-orange-500 bg-orange-500/20 glow-orange' 
                        : step.done && !step.isBonus
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-gray-700 bg-gray-900/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${
                      isActive ? step.isBonus ? 'text-yellow-500' : step.isSprint ? 'text-purple-500' : 'text-orange-500' : step.done && !step.isBonus ? 'text-green-500' : 'text-gray-500'
                    }`} />
                    <p className={`font-heading text-[8px] uppercase ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {!step.isBonus && (
                      <p className="font-data text-[9px] text-gray-500">{step.count}/{step.max}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bonus Options */}
            {selectionMode === "bonus" && (
              <div className="space-y-4 mb-6">
                <h3 className="font-heading text-lg uppercase text-yellow-500 flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Options Bonus
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Safety Car */}
                  <div className={`p-4 rounded-lg border-2 transition-all ${safetyCar ? 'border-yellow-500 bg-yellow-500/20' : 'border-gray-600 bg-gray-800/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-6 h-6 ${safetyCar ? 'text-yellow-400' : 'text-gray-500'}`} />
                        <Label className="font-heading text-white text-sm uppercase">Safety Car</Label>
                      </div>
                      <Switch checked={safetyCar} onCheckedChange={setSafetyCar} />
                    </div>
                    <p className={`font-data text-xs mt-2 ${safetyCar ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {safetyCar ? '✓ OUI' : '✗ NON'}
                    </p>
                  </div>

                  {/* DNF Drivers */}
                  <button
                    onClick={() => setSelectionMode("dnf_select")}
                    className={`p-4 rounded-lg text-left border-2 transition-all ${dnfDrivers.length > 0 ? 'border-red-500 bg-red-500/20' : 'border-gray-600 bg-gray-800/50 hover:border-red-500/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className={`w-6 h-6 ${dnfDrivers.length > 0 ? 'text-red-400' : 'text-gray-500'}`} />
                      <span className="font-heading text-white text-sm uppercase">DNF Pilotes</span>
                    </div>
                    <p className={`font-data text-xs mt-2 ${dnfDrivers.length > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {dnfDrivers.length} sélectionné(s) →
                    </p>
                  </button>
                </div>

                {/* Fastest Lap */}
                <div className="bonus-bet-card p-4 rounded-lg border-2 border-purple-500/30 bg-purple-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Timer className="w-6 h-6 text-purple-400" />
                      <span className="font-heading text-white text-base uppercase">Meilleur Tour</span>
                    </div>
                    {fastestLap && <Check className="w-5 h-5 text-green-400" />}
                  </div>
                  <Button
                    onClick={() => setSelectionMode("fastest_lap")}
                    className={`w-full h-12 text-base ${fastestLap ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' : 'bg-purple-500/20 border-2 border-purple-500 text-purple-300 hover:bg-purple-500/30'}`}
                  >
                    {fastestLap ? drivers.find(d => d.id === fastestLap)?.name : "→ Choisir un pilote"}
                  </Button>
                </div>

                {/* First Corner Leader */}
                <div className="bonus-bet-card p-4 rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-6 h-6 text-cyan-400" />
                      <span className="font-heading text-white text-base uppercase">Leader 1er Virage</span>
                    </div>
                    {firstCornerLeader && <Check className="w-5 h-5 text-green-400" />}
                  </div>
                  <Button
                    onClick={() => setSelectionMode("first_corner")}
                    className={`w-full h-12 text-base ${firstCornerLeader ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white' : 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-300 hover:bg-cyan-500/30'}`}
                  >
                    {firstCornerLeader ? drivers.find(d => d.id === firstCornerLeader)?.name : "→ Choisir un pilote"}
                  </Button>
                </div>
              </div>
            )}

            {/* DNF Selection Mode */}
            {selectionMode === "dnf_select" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-lg uppercase text-red-500 flex items-center gap-2">
                      <Users className="w-5 h-5" /> Pilotes DNF
                    </h3>
                    <p className="font-body text-xs text-gray-400">Sélectionne les pilotes qui ont abandonné</p>
                  </div>
                  <Button onClick={() => setSelectionMode("bonus")} variant="outline" size="sm" className="border-gray-600">
                    Retour
                  </Button>
                </div>
                
                {dnfDrivers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dnfDrivers.map(driverId => {
                      const driver = drivers.find(d => d.id === driverId);
                      return (
                        <div key={driverId} className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
                          <span className="font-body text-sm text-red-400">{driver?.name}</span>
                          <button onClick={() => setDnfDrivers(dnfDrivers.filter(d => d !== driverId))}>
                            <X className="w-4 h-4 text-red-400 hover:text-red-300" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selection Info */}
            {!showBonus && (
              <Card className="game-card mb-4">
                <CardContent className="p-4">
                  <p className="font-body text-gray-300">
                    {selectionMode === "quali_pole" && "Sélectionne le pilote en pole position"}
                    {selectionMode === "quali_top10" && `Sélectionne le Top 10 des qualifications (${qualiTop10.length}/10)`}
                    {selectionMode === "sprint_quali_pole" && "Sélectionne le pilote en pole position des qualifs sprint"}
                    {selectionMode === "sprint_quali_top10" && `Sélectionne le Top 10 des qualifs sprint (${sprintQualiTop10.length}/10)`}
                    {selectionMode === "sprint_race_winner" && "Sélectionne le vainqueur de la course sprint"}
                    {selectionMode === "sprint_race_top10" && `Sélectionne le Top 10 de la course sprint (${sprintRaceTop10.length}/10)`}
                    {selectionMode === "race_winner" && "Sélectionne le vainqueur de la course"}
                    {selectionMode === "race_top10" && `Sélectionne le Top 10 de la course (${raceTop10.length}/10)`}
                    {selectionMode === "fastest_lap" && "Sélectionne le pilote qui a fait le meilleur tour"}
                    {selectionMode === "first_corner" && "Sélectionne le leader au premier virage"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Drivers Grid */}
            {!["bonus"].includes(selectionMode) && (
              <div className="grid grid-cols-2 gap-3">
                {drivers.map((driver) => {
                  const selected = isDriverSelected(driver.id);
                  const position = getDriverPosition(driver.id);
                  const teamColor = TEAM_COLORS[driver.team] || "#666";

                  return (
                    <button
                      key={driver.id}
                      onClick={() => handleDriverSelect(driver.id)}
                      className={`driver-card-gaming relative p-4 rounded-lg border-l-4 transition-all text-left ${selected ? 'selected' : ''}`}
                      style={{ borderLeftColor: teamColor }}
                    >
                      {position && (
                        <div className={`absolute top-2 right-2 w-7 h-7 rounded flex items-center justify-center border ${
                          position <= 3 
                            ? position === 1 ? 'position-1-gaming' : position === 2 ? 'position-2-gaming' : 'position-3-gaming'
                            : 'bg-gradient-to-b from-orange-500 to-orange-700 border-orange-400'
                        }`}>
                          <span className={`font-heading text-sm ${position <= 3 && position !== 3 ? 'text-black' : 'text-white'}`}>{position}</span>
                        </div>
                      )}
                      {selected && !position && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-b from-green-500 to-green-700 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div 
                          className="w-11 h-11 rounded-lg flex items-center justify-center font-heading text-lg border-2"
                          style={{ backgroundColor: teamColor + '30', borderColor: teamColor, color: teamColor }}
                        >
                          {driver.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-sm uppercase tracking-tight text-white truncate">
                            {driver.name}
                          </p>
                          <p className="font-body text-xs text-gray-500 truncate">{driver.team}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>

      {/* Submit Button */}
      {adminTab === "results" && selectedRace && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || saving}
              className={`w-full h-14 font-heading uppercase tracking-wider transition-all ${
                isComplete ? 'btn-gaming' : 'bg-gray-800 text-gray-500 border-2 border-gray-700'
              }`}
              data-testid="submit-results-btn"
            >
              {saving ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Enregistrement...</>
              ) : (
                <><Save className="w-5 h-5 mr-2" />Enregistrer les résultats</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
