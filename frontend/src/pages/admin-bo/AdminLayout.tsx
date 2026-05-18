/**
 * Admin Back-Office Layout with sidebar navigation + app preview panel.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  LayoutDashboard,
  Users,
  Trophy,
  Flag,
  MessageSquare,
  Mail,
  Image,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Smartphone,
  Map,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import DashboardTab from "./tabs/DashboardTab";
import UsersTab from "./tabs/UsersTab";
import ChampionshipsTab from "./tabs/ChampionshipsTab";
import RacesTab from "./tabs/RacesTab";
import FeedbacksTab from "./tabs/FeedbacksTab";
import InvitationsTab from "./tabs/InvitationsTab";
import MediaTab from "./tabs/MediaTab";
import SettingsTab from "./tabs/SettingsTab";
import RoadmapTab from "./tabs/RoadmapTab";
import PreviewPanel from "./PreviewPanel";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, section: "general" },
  { key: "users", label: "Utilisateurs", icon: Users, section: "general" },
  { key: "championships", label: "Championnats", icon: Trophy, section: "general" },
  { key: "races", label: "Courses", icon: Flag, section: "general" },
  { key: "feedbacks", label: "Feedbacks", icon: MessageSquare, section: "general" },
  { key: "invitations", label: "Invitations", icon: Mail, section: "general" },
  { key: "media", label: "Médias", icon: Image, section: "general" },
  { key: "roadmap", label: "Roadmap", icon: Map, section: "dev" },
  { key: "settings", label: "Paramètres", icon: Settings, section: "general" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [adminEmail, setAdminEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    adminApi
      .me()
      .then((res) => setAdminEmail(res.data.email))
      .catch(() => navigate("/admin-bo/auth"));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      /* ignore */
    }
    navigate("/admin-bo/auth");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab />;
      case "users":
        return <UsersTab />;
      case "championships":
        return <ChampionshipsTab />;
      case "races":
        return <RacesTab />;
      case "feedbacks":
        return <FeedbacksTab />;
      case "invitations":
        return <InvitationsTab />;
      case "media":
        return <MediaTab />;
      case "settings":
        return <SettingsTab />;
      case "roadmap":
        return <RoadmapTab />;
      default:
        return <DashboardTab />;
    }
  };

  const generalItems = NAV_ITEMS.filter((i) => i.section === "general");
  const devItems = NAV_ITEMS.filter((i) => i.section === "dev");

  return (
    <div className="min-h-screen bg-[#050a14] flex">
      {/* Mobile sidebar toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-gray-800 rounded-lg text-gray-400"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0a0f1a] border-r border-gray-800 transform transition-transform lg:translate-x-0 flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="font-heading text-sm uppercase text-white tracking-tight">
                  Pronokif
                </h1>
                <p className="text-[10px] text-gray-500 font-body">Administration</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {generalItems.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveTab(key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-orange-400" : "text-gray-500"}`} />
                  <span className="font-body text-sm">{label}</span>
                </button>
              );
            })}

            {/* Dev section */}
            <div className="pt-3 mt-3 border-t border-gray-800">
              <p className="px-3 pb-2 font-body text-[10px] uppercase text-gray-600 tracking-wider">
                Développement
              </p>
              {devItems.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-gray-500"}`} />
                    <span className="font-body text-sm">{label}</span>
                  </button>
                );
              })}

              {/* Preview toggle */}
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mt-1 ${
                  previewOpen
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <Smartphone
                  className={`w-4 h-4 ${previewOpen ? "text-cyan-400" : "text-gray-500"}`}
                />
                <span className="font-body text-sm">Preview App</span>
                {previewOpen ? (
                  <PanelRightClose className="w-3 h-3 ml-auto text-cyan-500" />
                ) : (
                  <PanelRightOpen className="w-3 h-3 ml-auto text-gray-600" />
                )}
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800">
            <p className="font-body text-xs text-gray-500 truncate mb-3">{adminEmail}</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex-1 text-gray-400 hover:text-white text-xs"
              >
                <ChevronLeft className="w-3 h-3 mr-1" />
                App
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex-1 text-red-400 hover:text-red-300 text-xs"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Quitter
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={`flex-1 min-h-screen overflow-y-auto transition-all ${previewOpen ? "mr-[380px]" : ""}`}
      >
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* App Preview Panel */}
      <PreviewPanel open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </div>
  );
}
