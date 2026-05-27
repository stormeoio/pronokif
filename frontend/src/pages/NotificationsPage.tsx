import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Trophy,
  Users,
  Star,
  Clock,
  ChevronRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, easing, duration, getReducedMotionProps } from "@/lib/motion";

/* ── Types ─────────────────────────────────────────────── */

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

type FilterKey = "all" | "races" | "leagues" | "chat" | "badges";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "races", label: "Courses" },
  { key: "leagues", label: "Ligues" },
  { key: "chat", label: "Chat" },
  { key: "badges", label: "Badges" },
];

/* ── Category system ───────────────────────────────────── */

type NotifCategory = "chat" | "result" | "league" | "badge" | "info";

interface CategoryConfig {
  icon: LucideIcon;
  label: string;
  iconBg: string;
  iconColor: string;
  filterKey: FilterKey;
}

const CATEGORY_CONFIG: Record<NotifCategory, CategoryConfig> = {
  chat: {
    icon: MessageSquare,
    label: "Messages",
    iconBg: "bg-purple-500/[0.12]",
    iconColor: "text-purple-400",
    filterKey: "chat",
  },
  result: {
    icon: Trophy,
    label: "Resultats",
    iconBg: "bg-pk-emerald/[0.12]",
    iconColor: "text-pk-emerald",
    filterKey: "races",
  },
  league: {
    icon: Users,
    label: "Ligues",
    iconBg: "bg-pk-info/[0.12]",
    iconColor: "text-pk-info",
    filterKey: "leagues",
  },
  badge: {
    icon: Star,
    label: "Badges",
    iconBg: "bg-pk-amber/[0.12]",
    iconColor: "text-pk-amber",
    filterKey: "badges",
  },
  info: {
    icon: Bell,
    label: "General",
    iconBg: "bg-white/[0.06]",
    iconColor: "text-pk-titane",
    filterKey: "all",
  },
};

/** Map API type → display category */
function getCategory(type: string): NotifCategory {
  switch (type) {
    case "chat":
    case "message":
      return "chat";
    case "result":
    case "score":
    case "race":
      return "result";
    case "league":
    case "member":
      return "league";
    case "badge":
    case "achievement":
      return "badge";
    default:
      return "info";
  }
}

/* ── Helpers ───────────────────────────────────────────── */

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `${days}j`;
  return `${Math.floor(days / 7)}sem`;
}

/* ── Shimmer Skeleton ──────────────────────────────────── */

function NotificationsSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 p-4 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-32 rounded bg-pk-anthracite animate-shimmer" />
          <div className="h-5 w-20 rounded-full bg-pk-anthracite animate-shimmer" />
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-6 rounded-full bg-pk-anthracite animate-shimmer"
              style={{ width: `${50 + i * 8}px`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="px-4 pt-3 space-y-2 pb-24">
        {/* Urgent card skeleton */}
        <div className="rounded-lg bg-pk-red/[0.06] border border-pk-red/20 p-4 animate-shimmer">
          <div className="h-3 w-24 rounded bg-pk-red/20 mb-3" />
          <div className="h-4 w-3/4 rounded bg-pk-anthracite mb-2" />
          <div className="h-3 w-full rounded bg-pk-anthracite mb-3" />
          <div className="h-10 w-full rounded-md bg-pk-red/20" />
        </div>
        {/* Group skeletons */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg bg-pk-surface border border-white/[0.08] overflow-hidden animate-shimmer"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="flex items-center gap-2 p-3 border-b border-white/[0.08]">
              <div className="w-7 h-7 rounded-md bg-pk-anthracite" />
              <div className="h-3.5 w-20 rounded bg-pk-anthracite" />
            </div>
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <div className="w-1 h-1 rounded-full bg-pk-anthracite" />
                <div className="flex-1 h-3 rounded bg-pk-anthracite" />
                <div className="w-6 h-2.5 rounded bg-pk-anthracite" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  /* ── Queries ── */

  const { data: notifications = [], isLoading: notifsLoading } = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => api.notifications.list(),
  });

  const { data: unreadData, isLoading: countLoading } = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => api.notifications.unreadCount(),
  });

  const loading = notifsLoading || countLoading;
  const unreadCount = unreadData?.count || 0;

  /* ── Mutations ── */

  const markAsRead = async (notifId: string) => {
    try {
      await api.notifications.markRead(notifId);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications._def });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      haptic("success");
      await api.notifications.markAllRead();
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications._def });
    } catch (e) {
      console.error(e);
    }
  };

  /* ── Group + filter logic ── */

  const grouped = useMemo(() => {
    const groups: Record<NotifCategory, Notification[]> = {
      chat: [],
      result: [],
      league: [],
      badge: [],
      info: [],
    };

    (notifications as Notification[]).forEach((n) => {
      const cat = getCategory(n.type);
      groups[cat].push(n);
    });

    return groups;
  }, [notifications]);

  /** The most urgent unread notification (for the action card) */
  const urgentNotif = useMemo(() => {
    return (notifications as Notification[]).find(
      (n) => !n.is_read && (n.type === "important" || n.type === "race" || n.type === "result"),
    );
  }, [notifications]);

  /** Filter groups by active chip */
  const visibleCategories = useMemo(() => {
    const cats = Object.entries(grouped) as [NotifCategory, Notification[]][];
    if (activeFilter === "all") return cats.filter(([, items]) => items.length > 0);

    return cats.filter(([cat, items]) => {
      if (items.length === 0) return false;
      return CATEGORY_CONFIG[cat].filterKey === activeFilter;
    });
  }, [grouped, activeFilter]);

  /* ── Loading ── */

  if (loading) return <NotificationsSkeleton />;

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="notifications-page">
      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-display text-lg">Notifications</h1>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <motion.span
                  className="font-data text-[0.5625rem] px-2 py-0.5 rounded-full bg-pk-red text-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                </motion.span>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
                  title="Tout marquer lu"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-4 pb-2.5 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                haptic("selection");
                setActiveFilter(f.key);
              }}
              className={`font-data text-[0.5625rem] px-3 py-1 rounded-full whitespace-nowrap border transition-colors ${
                activeFilter === f.key
                  ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                  : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      <motion.div
        className="px-4 pt-3 space-y-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Urgent Action Card */}
        {urgentNotif && activeFilter === "all" && (
          <motion.div
            variants={fadeUp}
            className="bg-pk-red-subtle border border-pk-red/25 rounded-lg p-4"
          >
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pk-red animate-live-pulse" />
              <span className="font-data text-[0.5625rem] text-pk-red uppercase tracking-wider">
                Action requise
              </span>
            </div>
            <p className="font-bold text-[0.9375rem] text-pk-piste mb-1">{urgentNotif.title}</p>
            <p className="text-xs text-pk-titane mb-3 leading-relaxed">{urgentNotif.message}</p>
            <button
              onClick={() => {
                haptic("medium");
                markAsRead(urgentNotif.id);
                navigate("/");
              }}
              className="w-full h-10 rounded-md bg-pk-red text-white font-display text-[0.8125rem] flex items-center justify-center gap-1.5 shadow-glow-red active:scale-[0.97] transition-transform"
            >
              <Clock className="w-3.5 h-3.5" />
              Faire mes pronos
            </button>
          </motion.div>
        )}

        {/* Empty state */}
        {(notifications as Notification[]).length === 0 && (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center text-center py-16 px-6"
          >
            <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-pk-titane" />
            </div>
            <p className="font-display text-base text-pk-titane mb-1">Aucune notification</p>
            <p className="text-xs text-pk-titane/60 max-w-[240px]">
              Les resultats, messages et badges apparaitront ici.
            </p>
          </motion.div>
        )}

        {/* No results for this filter */}
        {(notifications as Notification[]).length > 0 && visibleCategories.length === 0 && (
          <motion.div variants={fadeUp} className="text-center py-12 px-6">
            <p className="text-sm text-pk-titane">Aucune notification dans cette categorie.</p>
          </motion.div>
        )}

        {/* Grouped Cards */}
        <AnimatePresence mode="popLayout">
          {visibleCategories.map(([cat, items]) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const unreadInGroup = items.filter((n) => !n.is_read).length;

            return (
              <motion.div
                key={cat}
                variants={fadeUp}
                layout
                exit={{ opacity: 0, y: -10, transition: { duration: duration.short / 1000 } }}
                className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
              >
                {/* Group header */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.08]">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${config.iconBg}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                  </div>
                  <span className="flex-1 text-[0.8125rem] font-bold">{config.label}</span>
                  <span className="font-data text-[0.5625rem] text-pk-titane">
                    {unreadInGroup > 0
                      ? `${unreadInGroup} nouveau${unreadInGroup > 1 ? "x" : ""}`
                      : `${items.length} lu${items.length > 1 ? "s" : ""}`}
                  </span>
                </div>

                {/* Items */}
                {items.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (!notif.is_read) {
                        haptic("light");
                        markAsRead(notif.id);
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.08] last:border-b-0 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span
                      className={`w-1 h-1 rounded-full flex-shrink-0 ${
                        !notif.is_read ? "bg-pk-red" : "bg-transparent"
                      }`}
                    />
                    <span
                      className={`flex-1 text-xs leading-snug ${
                        !notif.is_read ? "text-pk-piste" : "text-pk-titane"
                      }`}
                    >
                      <strong className="font-semibold">{notif.title}</strong>
                      {" — "}
                      {notif.message}
                    </span>
                    <span className="font-data text-[0.5rem] text-pk-titane flex-shrink-0">
                      {timeAgo(notif.created_at)}
                    </span>
                  </button>
                ))}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
