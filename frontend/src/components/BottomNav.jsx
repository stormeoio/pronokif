import { useLocation, useNavigate } from "react-router-dom";
import { Home, Trophy, Target, User, Bell, MessageCircle } from "lucide-react";
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
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const [notifRes, chatRes] = await Promise.all([
          apiClient.get("/notifications/unread-count"),
          apiClient.get("/leagues/unread-messages")
        ]);
        setUnreadCount(notifRes.data.count);
        setUnreadChatCount(chatRes.data.total_unread);
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
      className="fixed bottom-0 left-0 right-0 z-50"
      data-testid="bottom-nav"
    >
      {/* Kerb stripe decoration top */}
      <div className="h-2 bg-kerb-stripe" />
      
      {/* Chrome metallic navigation bar */}
      <div className="nav-chrome h-[72px] flex justify-around items-center px-2 pb-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          const showBadge = item.path === "/notifications" && unreadCount > 0;
          const showChatBadge = item.path === "/" && unreadChatCount > 0;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-[60px] h-[56px] rounded-xl transition-all relative ${
                isActive 
                  ? "nav-item-active shadow-lg" 
                  : "text-gray-700 hover:text-gray-900 hover:bg-white/40 active:scale-95"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-white drop-shadow-lg' : ''}
                />
                {/* Notification Badge */}
                {showBadge && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    <span className="font-data text-[10px] text-white font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
                {/* Chat Badge on Home */}
                {showChatBadge && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
                    <MessageCircle size={10} className="text-white" />
                  </div>
                )}
              </div>
              <span className={`text-[9px] mt-1 font-body font-semibold uppercase tracking-wider ${
                isActive ? 'text-white' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
