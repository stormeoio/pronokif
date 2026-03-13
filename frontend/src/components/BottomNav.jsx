import { useLocation, useNavigate } from "react-router-dom";
import { Home, Trophy, Target, User, Bell } from "lucide-react";
import { useAuth, apiClient } from "../App";
import { useState, useEffect } from "react";

const navItems = [
  { path: "/", icon: Home, label: "Accueil" },
  { path: "/predictions", icon: Target, label: "Pronos" },
  { path: "/leaderboard", icon: Trophy, label: "Classement" },
  { path: "/notifications", icon: Bell, label: "Notifs" },
  { path: "/profile", icon: User, label: "Profil" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await apiClient.get("/notifications/unread-count");
        setUnreadCount(res.data.count);
      } catch (e) {
        // Ignore
      }
    };

    if (user) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <nav 
      className="nav-gaming fixed bottom-0 left-0 right-0 h-20 flex justify-around items-center z-50"
      data-testid="bottom-nav"
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== "/" && location.pathname.startsWith(item.path));
        const Icon = item.icon;
        const showBadge = item.path === "/notifications" && unreadCount > 0;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nav-item-gaming flex flex-col items-center justify-center w-16 h-full transition-all relative ${
              isActive ? "active" : "text-gray-500 hover:text-gray-300"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <div className={`relative p-2 rounded-lg transition-all ${
              isActive ? 'bg-gradient-to-b from-orange-500/20 to-orange-600/10' : ''
            }`}>
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 1.5}
                className={`nav-icon transition-all ${
                  isActive ? 'text-orange-500' : ''
                }`}
              />
              {isActive && (
                <div className="absolute inset-0 bg-orange-500/20 rounded-lg blur-md" />
              )}
              {/* Notification Badge */}
              {showBadge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                  <span className="font-data text-[10px] text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-[10px] mt-1 font-body font-semibold uppercase tracking-wide ${
              isActive ? 'text-orange-500' : ''
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
