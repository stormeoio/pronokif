import { useLocation, useNavigate } from "react-router-dom";
import { Home, Trophy, Target, User, Bell } from "lucide-react";
import { useAuth } from "../App";
import { useState, useEffect } from "react";
import { apiClient } from "../App";

const navItems = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/predictions", icon: Target, label: "Pronostics" },
  { path: "/leaderboard", icon: Trophy, label: "Classement" },
  { path: "/profile", icon: User, label: "Profil" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiClient.get("/notifications");
        const unread = res.data.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (e) {
        // Ignore errors
      }
    };

    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 h-16 flex justify-around items-center z-50"
      data-testid="bottom-nav"
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== "/" && location.pathname.startsWith(item.path));
        const Icon = item.icon;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <Icon 
              size={22} 
              strokeWidth={isActive ? 2.5 : 1.5}
              className={isActive ? "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : ""}
            />
            <span className="text-[10px] mt-1 font-body">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
