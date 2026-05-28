/**
 * Admin Back-Office Layout with sidebar navigation + app preview panel.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
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
  Network,
  PanelRightOpen,
  PanelRightClose,
  Shield,
} from "lucide-react";
import DashboardTab from "./tabs/DashboardTab";
import UsersTab from "./tabs/UsersTab";
import PredictionsTab from "./tabs/PredictionsTab";
import LeaguesTab from "./tabs/LeaguesTab";
import ChampionshipsTab from "./tabs/ChampionshipsTab";
import RacesTab from "./tabs/RacesTab";
import FeedbacksTab from "./tabs/FeedbacksTab";
import InvitationsTab from "./tabs/InvitationsTab";
import MediaTab from "./tabs/MediaTab";
import SettingsTab from "./tabs/SettingsTab";
import RoadmapTab from "./tabs/RoadmapTab";
import AuditTab from "./tabs/AuditTab";
import PreviewPanel from "./PreviewPanel";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/brand";

const ADMIN_AUTH_PATH = "/admin/auth";

type AdminTabKey =
  | "dashboard"
  | "users"
  | "predictions"
  | "leagues"
  | "championships"
  | "races"
  | "feedbacks"
  | "invitations"
  | "media"
  | "audit"
  | "roadmap"
  | "settings";

type NavItem = {
  key: AdminTabKey;
  label: string;
  icon: typeof LayoutDashboard;
  section: "general" | "dev";
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "general" },
  { key: "users", label: "Users", icon: Users, section: "general" },
  { key: "predictions", label: "Pickstics", icon: BarChart3, section: "general" },
  { key: "leagues", label: "Leagues", icon: Network, section: "general" },
  { key: "championships", label: "Championnats", icon: Trophy, section: "general" },
  { key: "races", label: "Races", icon: Flag, section: "general" },
  { key: "feedbacks", label: "Feedbacks", icon: MessageSquare, section: "general" },
  { key: "invitations", label: "Invitations", icon: Mail, section: "general" },
  { key: "media", label: "Media", icon: Image, section: "general" },
  { key: "audit", label: "Audit", icon: Shield, section: "dev" },
  { key: "roadmap", label: "Roadmap", icon: Map, section: "dev" },
  { key: "settings", label: "Settings", icon: Settings, section: "general" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabKey>("dashboard");
  const [adminEmail, setAdminEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    adminApi
      .me()
      .then((res) => setAdminEmail(res.data.email))
      .catch(() => navigate(ADMIN_AUTH_PATH));
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {
      /* ignore */
    }
    navigate(ADMIN_AUTH_PATH);
  };

  const handleSelectTab = (tab: AdminTabKey) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab onNavigate={handleSelectTab} />;
      case "users":
        return <UsersTab />;
      case "predictions":
        return <PredictionsTab />;
      case "leagues":
        return <LeaguesTab />;
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
      case "audit":
        return <AuditTab />;
      case "roadmap":
        return <RoadmapTab />;
      default:
        return <DashboardTab />;
    }
  };

  const generalItems = NAV_ITEMS.filter((i) => i.section === "general");
  const devItems = NAV_ITEMS.filter((i) => i.section === "dev");

  return (
    <div className="min-h-screen bg-pk-carbon text-pk-piste flex">
      {/* Mobile sidebar toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-pk-anthracite/90 border border-white/[0.08] rounded-md text-pk-titane"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-pk-carbon/95 backdrop-blur-xl border-r border-white/[0.08] transform transition-transform lg:translate-x-0 flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/[0.08]">
            <div className="min-w-0">
              <img
                src={brandAssets.wordmarkWhiteRed}
                alt="PronoKif"
                className="h-6 w-auto max-w-[154px] object-contain"
                draggable={false}
              />
              <p className="mt-1 text-[10px] text-pk-titane font-body">Administration</p>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {generalItems.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectTab(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? "bg-pk-red-subtle text-pk-piste border border-pk-red/35 shadow-[0_0_20px_rgba(225,6,0,.12)]"
                      : "text-pk-titane hover:bg-white/[0.04] hover:text-pk-piste"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-pk-red" : "text-pk-titane"}`} />
                  <span className="font-body text-sm">{label}</span>
                </button>
              );
            })}

            {/* Dev section */}
            <div className="pt-3 mt-3 border-t border-white/[0.08]">
              <p className="px-3 pb-2 font-body text-[10px] uppercase text-pk-titane tracking-wider">
                Development
              </p>
              {devItems.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectTab(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-pk-red-subtle text-pk-piste border border-pk-red/35 shadow-[0_0_20px_rgba(225,6,0,.12)]"
                        : "text-pk-titane hover:bg-white/[0.04] hover:text-pk-piste"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-pk-red" : "text-pk-titane"}`} />
                    <span className="font-body text-sm">{label}</span>
                  </button>
                );
              })}

              {/* Preview toggle */}
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mt-1 ${
                  previewOpen
                    ? "bg-pk-red-subtle text-pk-piste border border-pk-red/35"
                    : "text-pk-titane hover:bg-white/[0.04] hover:text-pk-piste"
                }`}
              >
                <Smartphone
                  className={`w-4 h-4 ${previewOpen ? "text-pk-red" : "text-pk-titane"}`}
                />
                <span className="font-body text-sm">Preview App</span>
                {previewOpen ? (
                  <PanelRightClose className="w-3 h-3 ml-auto text-pk-red" />
                ) : (
                  <PanelRightOpen className="w-3 h-3 ml-auto text-pk-titane" />
                )}
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.08]">
            <p className="font-body text-xs text-pk-titane truncate mb-3">{adminEmail}</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="flex-1 text-pk-titane hover:text-pk-piste text-xs"
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        ref={mainRef}
        className={`flex-1 min-h-screen overflow-y-auto transition-all ${previewOpen ? "mr-[380px]" : ""}`}
        style={{
          background:
            "radial-gradient(circle at 50% -8%, rgba(225,6,0,.11), transparent 34%), linear-gradient(180deg, rgba(11,13,18,1) 0%, rgba(7,9,13,1) 100%)",
        }}
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
