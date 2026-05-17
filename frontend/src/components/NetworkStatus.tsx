import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";
import { haptic } from "@/lib/haptics";

/**
 * Floating banner that appears when network connectivity is lost,
 * and shows a brief "reconnected" toast when it comes back.
 */
export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      haptic("success");
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      haptic("error");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 bg-red-500/95 backdrop-blur-sm text-white text-sm font-body"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <WifiOff className="w-4 h-4" />
          <span>Hors connexion - les donnees seront synchronisees au retour</span>
        </motion.div>
      )}
      {showReconnected && isOnline && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 bg-green-500/95 backdrop-blur-sm text-white text-sm font-body"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Wifi className="w-4 h-4" />
          <span>Connexion retablie</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
