import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Button } from "../components/ui/button";
import {
  ArrowLeft, Bell, Check, Info, Zap, AlertTriangle, CheckCheck
} from "lucide-react";

const TYPE_CONFIG = {
  info: { icon: Info, color: "text-blue-400", bgColor: "bg-blue-500/20", label: "Information" },
  update: { icon: Zap, color: "text-green-400", bgColor: "bg-green-500/20", label: "Mise à jour" },
  important: { icon: AlertTriangle, color: "text-yellow-400", bgColor: "bg-yellow-500/20", label: "Important" }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading: notifsLoading } = useQuery({
    queryKey: ["/notifications"],
    queryFn: async () => {
      const res = await apiClient.get("/notifications");
      return res.data;
    },
  });

  const { data: unreadData, isLoading: countLoading } = useQuery({
    queryKey: ["/notifications/unread-count"],
    queryFn: async () => {
      const res = await apiClient.get("/notifications/unread-count");
      return res.data;
    },
  });

  const loading = notifsLoading || countLoading;
  const unreadCount = unreadData?.count || 0;

  const markAsRead = async (notifId) => {
    try {
      await apiClient.put(`/notifications/${notifId}/read`);
      queryClient.invalidateQueries({ queryKey: ["/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/notifications/unread-count"] });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put("/notifications/read-all");
      queryClient.invalidateQueries({ queryKey: ["/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/notifications/unread-count"] });
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-12 skeleton-arcade rounded-xl w-48" />
          <div className="h-24 skeleton-arcade rounded-xl" />
          <div className="h-24 skeleton-arcade rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="notifications-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0a1628] to-transparent p-4 border-b border-cyan-500/20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-heading text-xl text-white uppercase tracking-tight flex items-center gap-2">
                  <Bell className="w-5 h-5 text-cyan-400" />
                  Notifications
                </h1>
                <p className="font-body text-xs text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="ghost"
                size="sm"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="card-arcade p-8 text-center">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="font-heading text-lg text-gray-400 uppercase mb-1">Aucune notification</h3>
            <p className="font-body text-sm text-gray-500">
              Vous recevrez ici les actualités et mises à jour de PRONOKIF
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            
            return (
              <div
                key={notif.id}
                className={`card-arcade overflow-hidden transition-all ${
                  !notif.is_read ? 'ring-2 ring-cyan-500/30' : ''
                }`}
                data-testid={`notification-item-${notif.id}`}
              >
                <div className={`px-4 py-2 border-b border-gray-800 flex items-center justify-between ${config.bgColor}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className={`font-body text-xs uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="font-body text-[10px] text-gray-500">
                    {formatDate(notif.created_at)}
                  </span>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className={`font-heading text-lg ${!notif.is_read ? 'text-white' : 'text-gray-300'}`}>
                        {notif.title}
                      </h3>
                      <p className="font-body text-sm text-gray-400 mt-2 whitespace-pre-wrap">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors flex-shrink-0"
                        title="Marquer comme lu"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
