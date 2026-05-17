import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, RefreshCw, MessageSquare, Bug, Lightbulb } from "lucide-react";
import { api } from "@/lib/api";

interface FeedbackItem {
  id: number;
  username: string;
  category: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function FeedbackTab() {
  const queryClient = useQueryClient();

  const {
    data: feedbackList = [],
    isLoading: loadingFeedback,
    refetch: fetchFeedback,
  } = useQuery({
    queryKey: ["/admin/feedback"],
    queryFn: () => api.admin.feedback() as unknown as Promise<FeedbackItem[]>,
  });

  const markFeedbackRead = async (feedbackId: number) => {
    try {
      await api.admin.markFeedbackRead(feedbackId);
      queryClient.invalidateQueries({ queryKey: ["/admin/feedback"] });
    } catch (error: unknown) {
      console.error(error);
    }
  };

  /** Expose unread count via callback so the orchestrator can show the badge */
  const unreadCount = feedbackList.filter((f) => !f.read).length;

  return (
    <div className="space-y-4">
      <div className="card-arcade overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-600/20 to-transparent px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
          <h3 className="font-heading text-sm uppercase text-yellow-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages des utilisateurs
          </h3>
          <button onClick={() => fetchFeedback()} className="text-gray-400 hover:text-white" aria-label="Rafraîchir les feedbacks">
            <RefreshCw className={`w-4 h-4 ${loadingFeedback ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadingFeedback ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-yellow-500 animate-spin mx-auto" />
          </div>
        ) : feedbackList.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="font-body text-gray-500">Aucun feedback pour le moment</p>
          </div>
        ) : (
          <motion.div
            className="divide-y divide-gray-800"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {feedbackList.map((feedback) => {
              const categoryConfig: Record<
                string,
                { icon: typeof Bug; color: string; bg: string; label: string }
              > = {
                bug: { icon: Bug, color: "text-red-400", bg: "bg-red-500/20", label: "Bug" },
                suggestion: {
                  icon: Lightbulb,
                  color: "text-yellow-400",
                  bg: "bg-yellow-500/20",
                  label: "Suggestion",
                },
                feedback: {
                  icon: MessageSquare,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/20",
                  label: "Retour",
                },
              };
              const config = (categoryConfig[feedback.category] || categoryConfig.feedback)!;
              const Icon = config.icon;

              return (
                <motion.div
                  key={feedback.id}
                  className={`p-4 ${!feedback.read ? "bg-yellow-500/5" : ""}`}
                  variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body text-sm text-white font-semibold">
                          {feedback.username}
                        </span>
                        <span
                          className={`font-body text-xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                        {!feedback.read && <span className="w-2 h-2 bg-yellow-500 rounded-full" />}
                      </div>
                      <p className="font-body text-sm text-gray-400 whitespace-pre-wrap">
                        {feedback.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-body text-[10px] text-gray-600">
                          {new Date(feedback.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!feedback.read && (
                          <button
                            onClick={() => markFeedbackRead(feedback.id)}
                            className="font-body text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
