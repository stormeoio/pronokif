/**
 * AnimatedBottomNav — Premium bottom navigation with liquid indicator,
 * micro-animations, and haptic feedback.
 * Broadcast Premium: pk-carbon/red/piste/titane, no kerb stripe.
 */
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Trophy, Target, User, Users, MessageCircle, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";

// Prefetch map: path -> dynamic import (matches routes.tsx lazy imports)
const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/dashboard/DashboardPage"),
  "/predictions": () => import("@/pages/RaceCalendarPage"),
  "/championship": () => import("@/pages/championship/ChampionshipPage"),
  "/league": () => import("@/pages/LeaguePage"),
  "/profile": () => import("@/pages/profile/ProfilePage"),
};

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/predictions", icon: Target, label: "Picks" },
  { path: "/championship", icon: Flag, label: "Champ." },
  { path: "/league", icon: Users, label: "Ligues" },
  { path: "/profile", icon: User, label: "Profil" },
];

const BRAND_RED = "#E10600";
const BRAND_PISTE = "#F4F4F4";
const BRAND_TITANE = "#5F6673";

export default function AnimatedBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const data = await api.leagues.unreadMessages();
        setUnreadChatCount(data.total_unread);
      } catch {
        // Ignore
      }
    };
    void fetchUnread();
    const interval = setInterval(() => void fetchUnread(), 30000);
    return () => clearInterval(interval);
  }, [user]);

  const activeIndex = useMemo(() => {
    const idx = navItems.findIndex(
      (item) =>
        location.pathname === item.path ||
        (item.path !== "/" && location.pathname.startsWith(item.path)),
    );
    return idx >= 0 ? idx : 0;
  }, [location.pathname]);

  const handleTap = (path: string) => {
    haptic("selection");
    navigate(path);
  };

  // Prefetch route chunk on pointer enter (hover/touch start)
  const prefetchedRef = useRef(new Set<string>());
  const handlePrefetch = useCallback((path: string) => {
    if (prefetchedRef.current.has(path)) return;
    const loader = PREFETCH_MAP[path];
    if (loader) {
      prefetchedRef.current.add(path);
      void loader();
    }
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" aria-label="Navigation principale">
      {/* Glass nav bar */}
      <div className="relative h-[72px] bg-pk-carbon/95 backdrop-blur-xl border-t border-white/[0.06]">
        {/* Animated glow indicator */}
        <motion.div
          className="absolute top-0 h-[3px] rounded-full"
          style={{ width: `${100 / navItems.length}%` }}
          animate={{
            left: `${(activeIndex / navItems.length) * 100}%`,
            backgroundColor: BRAND_RED,
            boxShadow: `0 0 20px ${BRAND_RED}, 0 0 40px rgba(225,6,0,.28)`,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />

        {/* Background blob behind active */}
        <motion.div
          className="absolute top-3 w-14 h-14 rounded-2xl"
          animate={{
            left: `calc(${(activeIndex / navItems.length) * 100}% + ${100 / navItems.length / 2}% - 28px)`,
            backgroundColor: "rgba(225,6,0,.12)",
            boxShadow: "inset 0 0 0 1px rgba(225,6,0,.16)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />

        {/* Nav items */}
        <div className="flex justify-around items-center h-full px-2">
          {navItems.map((item, i) => {
            const isActive = i === activeIndex;
            const Icon = item.icon;
            const showBadge = item.path === "/league" && unreadChatCount > 0;

            return (
              <motion.button
                key={item.path}
                onClick={() => handleTap(item.path)}
                onPointerEnter={() => handlePrefetch(item.path)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl"
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <motion.div
                  className="relative"
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className="transition-colors duration-200"
                    style={{ color: isActive ? BRAND_PISTE : BRAND_TITANE }}
                  />

                  {/* Unread badge */}
                  {showBadge && (
                    <motion.div
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pk-red rounded-full flex items-center justify-center shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <MessageCircle size={8} className="text-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Label */}
                <AnimatePresence>
                  <motion.span
                    className="text-[9px] mt-1 font-data font-semibold uppercase tracking-wider"
                    animate={{
                      color: isActive ? BRAND_PISTE : BRAND_TITANE,
                      opacity: isActive ? 1 : 0.7,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                </AnimatePresence>

                {/* Active dot */}
                {isActive && (
                  <motion.div
                    className="absolute bottom-1.5 w-1 h-1 rounded-full"
                    style={{ backgroundColor: BRAND_RED, boxShadow: "0 0 10px rgba(225,6,0,.7)" }}
                    layoutId="nav-dot"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Safe area padding for iOS */}
      <div className="h-safe bg-pk-carbon/95" />
    </nav>
  );
}
