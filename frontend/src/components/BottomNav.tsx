import { useLocation, useNavigate } from "react-router-dom";
import { Home, Trophy, Target, User, Users, MessageCircle, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

// ------------------------------------------------------------------ types ---

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

// ----------------------------------------------------------- nav items ---

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/predictions", icon: Target, label: "Pronos" },
  { path: "/championship", icon: Flag, label: "Championnat" },
  { path: "/league", icon: Users, label: "Ligues" },
  { path: "/profile", icon: User, label: "Profil" },
];

// ----------------------------------------------------------- component ---

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnread = async (): Promise<void> => {
      try {
        const data = await api.leagues.unreadMessages();
        setUnreadChatCount(data.total_unread);
      } catch {
        // Ignore
      }
    };

    if (user) {
      void fetchUnread();
      const interval = setInterval(() => void fetchUnread(), 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      aria-label="Navigation principale"
      data-testid="bottom-nav"
    >
      {/* Kerb stripe decoration top */}
      <div className="h-2 bg-kerb-stripe" />

      {/* Chrome metallic navigation bar */}
      <div className="nav-chrome h-[68px] flex justify-around items-center px-1 pb-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          const showChatBadge = item.path === "/league" && unreadChatCount > 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center w-[52px] h-[52px] rounded-xl transition-all relative ${
                isActive
                  ? "nav-item-active shadow-lg"
                  : "text-gray-700 hover:text-gray-900 hover:bg-white/40 active:scale-95"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-white drop-shadow-lg" : ""}
                />
                {/* Chat Badge on Leagues */}
                {showChatBadge && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    <MessageCircle size={8} className="text-white" />
                  </div>
                )}
              </div>
              <span
                className={`text-[8px] mt-0.5 font-body font-semibold uppercase tracking-wider ${
                  isActive ? "text-white" : "text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
