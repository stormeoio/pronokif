import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const notifications = await api.notifications.list();
      setUnreadCount(notifications.filter((n) => !n.is_read).length);
    } catch (error: unknown) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    haptic("light");
    navigate("/notifications");
  };

  return (
    <motion.button
      onClick={handleClick}
      aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
      className="relative p-2 rounded-lg text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors"
      data-testid="notification-bell"
      whileTap={{ scale: 0.85 }}
      whileHover={{ rotate: [0, -10, 10, -5, 0] }}
      transition={{ duration: 0.5 }}
    >
      <Bell className="w-5 h-5" aria-hidden="true" />
      <AnimatePresence>
      {unreadCount > 0 && (
        <motion.span
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
          aria-hidden="true"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </motion.span>
      )}
      </AnimatePresence>
    </motion.button>
  );
}
