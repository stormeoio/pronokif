import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  ChevronLeft, Bell, Check, CheckCheck, Trophy, Flag, 
  AlertTriangle, Zap, Trash2
} from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_ICONS = {
  "results": Trophy,
  "reminder": AlertTriangle,
  "level_up": Zap,
  "default": Bell,
};

const NOTIFICATION_COLORS = {
  "results": "text-green-500",
  "reminder": "text-yellow-500",
  "level_up": "text-cyan-500",
  "default": "text-gray-400",
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get("/notifications");
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await apiClient.post(`/notifications/${notifId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, read: true } : n)
      );
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("Toutes les notifications marquées comme lues");
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton-gaming rounded-md" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" data-testid="notifications-page" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-orange-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="font-heading text-xl uppercase tracking-tight text-orange-500 flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="font-body text-xs text-gray-400">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-cyan-400 hover:text-cyan-300">
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout lire
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {notifications.length === 0 ? (
          <Card className="game-card">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="font-heading text-lg uppercase text-gray-400 mb-2">Aucune notification</p>
              <p className="font-body text-sm text-gray-500">Tu recevras des notifications pour les rappels et résultats</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const Icon = NOTIFICATION_ICONS[notif.type] || NOTIFICATION_ICONS.default;
              const colorClass = NOTIFICATION_COLORS[notif.type] || NOTIFICATION_COLORS.default;

              return (
                <Card 
                  key={notif.id} 
                  className={`game-card transition-all ${!notif.read ? 'border-orange-500/50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        notif.read ? 'bg-gray-800' : 'bg-orange-500/20'
                      }`}>
                        <Icon className={`w-5 h-5 ${notif.read ? 'text-gray-500' : colorClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-body text-sm ${notif.read ? 'text-gray-400' : 'text-white'}`}>
                          {notif.message}
                        </p>
                        <p className="font-data text-xs text-gray-500 mt-1">
                          {formatDate(notif.created_at)}
                        </p>
                      </div>
                      {!notif.read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => markAsRead(notif.id)}
                          className="text-gray-400 hover:text-green-500 flex-shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
