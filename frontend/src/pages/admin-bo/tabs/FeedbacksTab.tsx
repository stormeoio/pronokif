/**
 * Admin Feedbacks management tab.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Bug, Lightbulb, Trash2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";

interface Feedback {
  id: string;
  user_id: string;
  username: string;
  category: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function FeedbacksTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "feedbacks"],
    queryFn: () => adminApi.feedbacks.list({ limit: 100 }),
  });

  const feedbacks: Feedback[] = data?.feedbacks ?? [];

  const handleMarkRead = async (id: string) => {
    try {
      await adminApi.feedbacks.markRead(id);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "feedbacks"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce retour ?")) return;
    try {
      await adminApi.feedbacks.delete(id);
      toast.success("Retour supprimé");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "feedbacks"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "bug":
        return <Bug className="w-4 h-4 text-red-400" />;
      case "suggestion":
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
    }
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case "bug":
        return "Bug";
      case "suggestion":
        return "Suggestion";
      default:
        return "Autre";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Retours</h2>
        <span className="font-data text-sm text-gray-500">{data?.total ?? 0} au total</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-body text-gray-500">Aucun retour</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className={`card-arcade p-4 ${!fb.read ? "border-l-4 border-yellow-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {categoryIcon(fb.category)}
                    <span className="font-body text-xs text-gray-400">
                      {categoryLabel(fb.category)}
                    </span>
                    <span className="font-body text-xs text-white font-semibold">
                      {fb.username}
                    </span>
                    {!fb.read && <span className="w-2 h-2 bg-yellow-500 rounded-full" />}
                  </div>
                  <p className="font-body text-sm text-gray-300 whitespace-pre-wrap">
                    {fb.message}
                  </p>
                  <p className="font-body text-[10px] text-gray-600 mt-2">
                    {new Date(fb.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!fb.read && (
                    <button
                      onClick={() => handleMarkRead(fb.id)}
                      className="p-1.5 text-gray-400 hover:text-green-400 rounded"
                      title="Marquer comme lu"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(fb.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
