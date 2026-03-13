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
      className="nav-chrome fixed bottom-0 left-0 right-0 h-20 flex justify-around items-center z-50 px-2"
      data-testid="bottom-nav"
    >
      {/* Kerb stripe decoration top */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-kerb-stripe" />
      
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== "/" && location.pathname.startsWith(item.path));
        const Icon = item.icon;
        const showBadge = item.path === "/notifications" && unreadCount > 0;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all relative ${
              isActive 
                ? "nav-item-active" 
                : "text-gray-600 hover:text-gray-800 hover:bg-white/30"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <div className="relative">
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? 'text-white' : ''}
              />
              {/* Notification Badge */}
              {showBadge && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-racing-red rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                     style={{ backgroundColor: '#e63946' }}>
                  <span className="font-data text-[10px] text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-[10px] mt-1 font-body font-semibold uppercase tracking-wide ${
              isActive ? 'text-white' : 'text-gray-700'
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
