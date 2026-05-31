/**
 * Admin Back-Office Layout with sidebar navigation + app preview panel.
 */
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BarChart3,
  Calculator,
  LayoutDashboard,
  Users,
  Trophy,
  Flag,
  Mail,
  Image,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Smartphone,
  Route,
  Network,
  PanelRightOpen,
  PanelRightClose,
  Wrench,
} from "lucide-react";
import DashboardTab from "./tabs/DashboardTab";
import UsersTab from "./tabs/UsersTab";
import PredictionsTab from "./tabs/PredictionsTab";
import ScoringTab from "./tabs/ScoringTab";
import LeaguesTab from "./tabs/LeaguesTab";
import ChampionshipsTab from "./tabs/ChampionshipsTab";
import RacesTab from "./tabs/RacesTab";
import InvitationsTab from "./tabs/InvitationsTab";
import MediaTab from "./tabs/MediaTab";
import SettingsTab from "./tabs/SettingsTab";
import ActivityLogsTab from "./tabs/ActivityLogsTab";
import CircuitMapsTab from "./tabs/CircuitMapsTab";
import DevOpsTab, { devOpsSectionFromKey, type DevOpsSectionKey } from "./tabs/DevOpsTab";
import PreviewPanel from "./PreviewPanel";
import AdminDeepSearch from "./AdminDeepSearch";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";
import { brandAssets } from "@/lib/brand";

const ADMIN_AUTH_PATH = "/admin/auth";

type AdminTabKey =
  | "dashboard"
  | "users"
  | "predictions"
  | "scoring"
  | "leagues"
  | "championships"
  | "races"
  | "circuitMaps"
  | "invitations"
  | "media"
  | "activity"
  | "devops"
  | "settings";

type AdminDestinationKey =
  | AdminTabKey
  | "beta"
  | "feedbacks"
  | "knowledge"
  | "legal"
  | "translations"
  | "audit"
  | "roadmap";

type AdminSelection = {
  tab: AdminTabKey;
  devOpsSection: DevOpsSectionKey;
};

type NavItem = {
  key: AdminTabKey;
  label: string;
  icon: typeof LayoutDashboard;
  section: "general" | "dev";
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, section: "general" },
  { key: "users", label: "Utilisateurs", icon: Users, section: "general" },
  { key: "predictions", label: "Pronostics", icon: BarChart3, section: "general" },
  { key: "scoring", label: "Scores", icon: Calculator, section: "general" },
  { key: "leagues", label: "Ligues", icon: Network, section: "general" },
  { key: "championships", label: "Championnats", icon: Trophy, section: "general" },
  { key: "races", label: "Courses", icon: Flag, section: "general" },
  { key: "circuitMaps", label: "Cartes circuits", icon: Route, section: "general" },
  { key: "invitations", label: "Invitations", icon: Mail, section: "general" },
  { key: "media", label: "Médias", icon: Image, section: "general" },
  { key: "activity", label: "Activité", icon: Activity, section: "general" },
  { key: "devops", label: "DevOps", icon: Wrench, section: "dev" },
  { key: "settings", label: "Paramètres", icon: Settings, section: "general" },
];

const ADMIN_TAB_ALIASES: Record<string, AdminTabKey> = {
  circuitmaps: "circuitMaps",
  "circuit-maps": "circuitMaps",
  circuits: "circuitMaps",
};

function selectionFromSearch(search: string): AdminSelection {
  const rawTab = new URLSearchParams(search).get("tab");
  if (!rawTab) return { tab: "dashboard", devOpsSection: "beta" };
  const normalized = rawTab.trim();
  const devOpsSection = devOpsSectionFromKey(normalized);
  if (devOpsSection) return { tab: "devops", devOpsSection };
  const aliased = ADMIN_TAB_ALIASES[normalized.toLowerCase()] ?? normalized;
  if (aliased === "devops") {
    const section = devOpsSectionFromKey(new URLSearchParams(search).get("devops"));
    return { tab: "devops", devOpsSection: section ?? "beta" };
  }
  return NAV_ITEMS.some((item) => item.key === aliased)
    ? { tab: aliased as AdminTabKey, devOpsSection: "beta" }
    : { tab: "dashboard", devOpsSection: "beta" };
}

function normalizeDestination(destination: AdminDestinationKey): AdminSelection {
  const devOpsSection = devOpsSectionFromKey(destination);
  if (devOpsSection) return { tab: "devops", devOpsSection };
  return { tab: destination as AdminTabKey, devOpsSection: "beta" };
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const initialSelection = selectionFromSearch(location.search);
  const [activeTab, setActiveTab] = useState<AdminTabKey>(() => initialSelection.tab);
  const [activeDevOpsSection, setActiveDevOpsSection] = useState<DevOpsSectionKey>(
    () => initialSelection.devOpsSection,
  );
  const [adminEmail, setAdminEmail] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    adminApi
      .me()
      .then((res) => {
        setAdminEmail(res.data.email);
        setAuthChecked(true);
      })
      .catch(() => navigate(ADMIN_AUTH_PATH, { replace: true }));
  }, [navigate]);

  useEffect(() => {
    const nextSelection = selectionFromSearch(location.search);
    setActiveTab(nextSelection.tab);
    setActiveDevOpsSection(nextSelection.devOpsSection);
  }, [location.search]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-pk-red/25 border-t-pk-red animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      // Revoke device token if stored
      let deviceToken: string | undefined;
      try {
        deviceToken = localStorage.getItem("pronokif:admin-device") ?? undefined;
      } catch {
        /* ignore */
      }
      await adminApi.logout(deviceToken);
      try {
        localStorage.removeItem("pronokif:admin-device");
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
    navigate(ADMIN_AUTH_PATH);
  };

  const handleSelectTab = (destination: AdminDestinationKey, entityId?: string | null) => {
    const nextSelection = normalizeDestination(destination);
    setActiveTab(nextSelection.tab);
    setActiveDevOpsSection(nextSelection.devOpsSection);
    setSidebarOpen(false);
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("race");
    searchParams.delete("user");
    searchParams.delete("prediction");
    searchParams.set("tab", nextSelection.tab);
    if (nextSelection.tab === "devops") {
      searchParams.set("devops", nextSelection.devOpsSection);
    } else {
      searchParams.delete("devops");
    }
    if (entityId) {
      if (nextSelection.tab === "races" || nextSelection.tab === "scoring") {
        searchParams.set("race", entityId);
      }
      if (nextSelection.tab === "users") {
        searchParams.set("user", entityId);
      }
      if (nextSelection.tab === "predictions") {
        searchParams.set("prediction", entityId);
      }
    }
    navigate({ pathname: "/admin", search: `?${searchParams.toString()}` }, { replace: true });
    window.requestAnimationFrame(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleSelectDevOpsSection = (section: DevOpsSectionKey) => {
    handleSelectTab(section);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab onNavigate={handleSelectTab} />;
      case "users":
        return <UsersTab />;
      case "predictions":
        return <PredictionsTab />;
      case "scoring":
        return <ScoringTab />;
      case "leagues":
        return <LeaguesTab />;
      case "championships":
        return <ChampionshipsTab />;
      case "races":
        return <RacesTab />;
      case "circuitMaps":
        return <CircuitMapsTab currentAdminEmail={adminEmail} />;
      case "invitations":
        return <InvitationsTab />;
      case "media":
        return <MediaTab />;
      case "activity":
        return <ActivityLogsTab />;
      case "devops":
        return (
          <DevOpsTab
            activeSection={activeDevOpsSection}
            currentAdminEmail={adminEmail}
            onSectionChange={handleSelectDevOpsSection}
          />
        );
      case "settings":
        return <SettingsTab />;
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
            <button
              type="button"
              onClick={() => handleSelectTab("dashboard")}
              className="group min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-red/40"
              aria-label="Retour au tableau de bord admin"
              title="Retour au tableau de bord"
              data-testid="admin-logo-home"
            >
              <img
                src={brandAssets.wordmarkWhiteRed}
                alt="PronoKif"
                className="h-6 w-auto max-w-[154px] object-contain transition-opacity group-hover:opacity-85"
                draggable={false}
              />
              <p className="mt-1 text-[10px] text-pk-titane font-body">Administration</p>
            </button>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {generalItems.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectTab(key)}
                  data-testid={`admin-tab-${key}`}
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
                DevOps
              </p>
              {devItems.map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectTab(key)}
                    data-testid={`admin-tab-${key}`}
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
                <span className="font-body text-sm">Aperçu de l'app</span>
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
        <div className="max-w-6xl mx-auto px-4 pb-4 pt-16 lg:p-8">
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
      <AdminDeepSearch />
    </div>
  );
}
