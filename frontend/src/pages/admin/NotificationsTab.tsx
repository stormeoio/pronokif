import { useState } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Bell, Send, Loader2, Zap, AlertTriangle, Info,
} from "lucide-react";

export default function NotificationsTab() {
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [sendingNotif, setSendingNotif] = useState(false);

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error("Remplissez le titre et le message");
      return;
    }

    setSendingNotif(true);
    try {
      await apiClient.post("/admin/notifications", {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        type: notifType
      });
      toast.success("Notification envoyee a tous les membres !");
      setNotifTitle("");
      setNotifMessage("");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-arcade overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600/20 to-transparent px-4 py-3 border-b border-gray-700/50">
          <h3 className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Envoyer une notification
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Notification Type */}
          <div>
            <Label className="font-body text-sm text-gray-400 mb-2 block">Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "info", label: "Info", icon: Info, color: "blue" },
                { id: "update", label: "Mise a jour", icon: Zap, color: "green" },
                { id: "important", label: "Important", icon: AlertTriangle, color: "yellow" }
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = notifType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setNotifType(type.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `bg-${type.color}-500/20 border-${type.color}-500 text-${type.color}-400`
                        : 'bg-white/5 border-gray-700 text-gray-400 hover:bg-white/10'
                    }`}
                    style={isSelected ? {
                      backgroundColor: type.color === 'blue' ? 'rgba(59,130,246,0.2)' :
                                     type.color === 'green' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)',
                      borderColor: type.color === 'blue' ? '#3b82f6' :
                                  type.color === 'green' ? '#22c55e' : '#eab308'
                    } : {}}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1"
                          style={{ color: isSelected ? (type.color === 'blue' ? '#60a5fa' : type.color === 'green' ? '#4ade80' : '#facc15') : undefined }} />
                    <p className="font-body text-xs">{type.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="font-body text-sm text-gray-400 mb-2 block">Titre</Label>
            <Input
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="Ex: Nouvelle fonctionnalite disponible !"
              maxLength={100}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>

          {/* Message */}
          <div>
            <Label className="font-body text-sm text-gray-400 mb-2 block">
              Message
              <span className="text-gray-600 ml-2">({notifMessage.length}/5000)</span>
            </Label>
            <Textarea
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Detaillez votre message..."
              rows={8}
              maxLength={5000}
              className="bg-gray-900 border-gray-700 text-white resize-none"
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={sendNotification}
            disabled={!notifTitle.trim() || !notifMessage.trim() || sendingNotif}
            className="btn-racing w-full h-12"
          >
            {sendingNotif ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Envoi en cours...</>
            ) : (
              <><Send className="w-5 h-5 mr-2" /> Envoyer a tous les membres</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
