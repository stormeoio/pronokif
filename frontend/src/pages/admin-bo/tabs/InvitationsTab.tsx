/**
 * Admin Invitations tab — send and track email invites.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, Loader2, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Invitation {
  id: string;
  email: string;
  message?: string;
  sent_by: string;
  accepted: boolean;
  created_at: string;
  expires_at: string;
}

export default function InvitationsTab() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "invitations"],
    queryFn: () => adminApi.invitations.list(),
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await adminApi.invitations.send({ email, message: message || undefined });
      toast.success("Invitation sent!");
      setEmail("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "invitations"] });
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { detail?: string } } };
      toast.error(e2.response?.data?.detail || "Error while sending");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h2 className="font-heading text-2xl text-white uppercase tracking-tight mb-6">
        Invitations
      </h2>

      {/* Send form */}
      <form
        onSubmit={handleSend}
        className="card-arcade p-4 mb-6 border border-cyan-500/30 space-y-3"
      >
        <h3 className="font-heading text-sm text-cyan-400 uppercase flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send an invitation
        </h3>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email.com"
          className="bg-gray-900 border-gray-700 text-white"
          required
        />
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Custom message (optional)"
          rows={2}
          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 resize-none"
        />
        <Button type="submit" disabled={!email || sending} size="sm" className="btn-racing text-xs">
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Mail className="w-4 h-4 mr-1" />
          )}
          Send invitation
        </Button>
      </form>

      {/* List */}
      <h3 className="font-heading text-sm text-gray-400 uppercase mb-3">Historique</h3>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-body text-gray-500">No invitations sent</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv: Invitation) => (
            <div key={inv.id} className="card-arcade p-3 flex items-center justify-between">
              <div>
                <p className="font-body text-sm text-white">{inv.email}</p>
                <p className="font-body text-xs text-gray-500">
                  Sent on{" "}
                  {new Date(inv.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                  {inv.message &&
                    ` — "${inv.message.slice(0, 50)}${inv.message.length > 50 ? "..." : ""}"`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {inv.accepted ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                    <Check className="w-3 h-3" /> Accepted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/20 px-2 py-1 rounded">
                    <Clock className="w-3 h-3" /> En attente
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
