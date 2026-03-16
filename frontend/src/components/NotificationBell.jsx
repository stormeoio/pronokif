import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { 
  Bell, X, Check, Info, Zap, AlertTriangle, ChevronRight
} from "lucide-react";

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-400", bgColor: "bg-blue-500/20" },
  update: { icon: Zap, color: "text-green-400", bgColor: "bg-green-500/20" },
  important: { icon: AlertTriangle, color: "text-yellow-400", bgColor: "bg-yellow-500/20" }
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/notifications");
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notifId) => {
    try {
      await apiClient.put(`/notifications/${notifId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 card-arcade overflow-hidden shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200" data-testid="notification-dropdown">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-600/20 to-transparent p-3 border-b border-cyan-500/30 flex items-center justify-between">
            <h3 className="font-heading text-sm text-white uppercase tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="font-body text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                data-testid="mark-all-read"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-body text-sm text-gray-500">Aucune notification</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                const Icon = config.icon;
                
                return (
                  <div
                    key={notif.id}
                    className={`p-3 border-b border-gray-800 transition-colors ${
                      !notif.is_read ? 'bg-blue-500/5' : ''
                    }`}
                    data-testid={`notification-${notif.id}`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-body text-sm ${!notif.is_read ? 'text-white font-semibold' : 'text-gray-300'}`}>
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif.id);
                              }}
                              className="p-1 text-gray-500 hover:text-cyan-400 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="font-body text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <p className="font-body text-[10px] text-gray-600 mt-1">
                          {formatTime(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-800">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="w-full p-2 text-center font-body text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors flex items-center justify-center gap-1"
              data-testid="view-all-notifications"
            >
              Voir toutes les notifications
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
