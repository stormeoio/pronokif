import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Shield, Loader2, Trophy, Bell, MessageSquare, Users } from "lucide-react";
import ResultsTab from "./ResultsTab";
import NotificationsTab from "./NotificationsTab";
import FeedbackTab from "./FeedbackTab";
import MembersTab from "./MembersTab";
import { useAdminData } from "./useAdminData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { loading, isAdmin, isAccessDenied, races, drivers, refetchRaces } = useAdminData();
  const [adminTab, setAdminTab] = useState("results");

  // Expose setRaces-like behavior via refetch (ResultsTab may need to update after sync)
  const setRaces = () => refetchRaces();

  if (loading) {
    return (
      <div
        className="min-h-screen p-4 pt-6"
        style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)" }}
      >
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
            <h2 className="font-heading text-2xl uppercase text-white mb-2">Acces Refuse</h2>
            <p className="font-body text-gray-400 mb-6">
              Only league creators can access this page.
            </p>
            <Button onClick={() => navigate("/")} className="btn-racing">
              Back to home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "results", label: "Resultats", icon: Trophy, activeColor: "red" },
    { key: "notifications", label: "Notifs", icon: Bell, activeColor: "cyan" },
    { key: "feedback", label: "Backs", icon: MessageSquare, activeColor: "yellow" },
    { key: "members", label: "Members", icon: Users, activeColor: "green" },
  ];

  return (
    <div className="min-h-screen bg-app-main" data-testid="admin-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-red-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                Administration
              </h1>
              <p className="font-body text-xs text-gray-400">Enter official results</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-32">
        {/* Admin Tabs */}
        <motion.div
          className="grid grid-cols-4 gap-2 mb-6"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        >
          {tabs.map(({ key, label, icon: Icon, activeColor }) => {
            const isActive = adminTab === key;
            return (
              <motion.button
                key={key}
                onClick={() => {
                  haptic("selection");
                  setAdminTab(key);
                }}
                className={`p-3 rounded-xl font-heading text-xs uppercase transition-all ${
                  isActive
                    ? `bg-${activeColor}-500/20 border-2 border-${activeColor}-500 text-${activeColor}-400`
                    : "bg-white/5 border-2 border-gray-700 text-gray-400 hover:bg-white/10"
                }`}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                {label}
              </motion.button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={adminTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {adminTab === "results" && (
              <ResultsTab races={races} setRaces={setRaces} drivers={drivers} />
            )}
            {adminTab === "notifications" && <NotificationsTab />}
            {adminTab === "feedback" && <FeedbackTab />}
            {adminTab === "members" && <MembersTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
