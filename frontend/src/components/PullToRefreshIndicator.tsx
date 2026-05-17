/**
 * PullToRefreshIndicator — Visual feedback during pull-to-refresh gesture.
 */
import { motion, AnimatePresence } from "framer-motion";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export default function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <AnimatePresence>
      {(pullDistance > 0 || refreshing) && (
        <motion.div
          className="flex justify-center overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: pullDistance, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="flex items-center justify-center">
            <motion.div
              className={`w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent ${
                refreshing ? "animate-spin" : ""
              }`}
              style={!refreshing ? { transform: `rotate(${rotation}deg)` } : undefined}
              animate={refreshing ? { scale: [1, 1.1, 1] } : { scale: progress }}
              transition={refreshing ? { repeat: Infinity, duration: 0.8 } : undefined}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
