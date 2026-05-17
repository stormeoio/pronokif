import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Timer, RotateCcw, Play, Target, Share2, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";

interface BatakGameProps {
  onSubmit?: (score: number, duration: number, isTraining: boolean) => Promise<void>;
  attemptsRemaining?: number;
  isTraining?: boolean;
}

interface BatakTarget {
  id: number;
  position: number;
}

interface League {
  id: number;
  name: string;
}

// Hit particle effect on target click
function HitEffect({ x, y }: { x: number; y: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        angle: (i / 8) * Math.PI * 2,
        distance: 20 + Math.random() * 30,
        size: 2 + Math.random() * 3,
      })),
    [],
  );

  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-400"
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function BatakGame({ onSubmit, attemptsRemaining, isTraining = false }: BatakGameProps) {
  const [gameState, setGameState] = useState("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState<BatakTarget[]>([]);
  const [gridSize] = useState({ cols: 4, rows: 3 });
  const [hitEffects, setHitEffects] = useState<{ id: number; x: number; y: number }[]>([]);
  const [lastHitCell, setLastHitCell] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [userLeagues, setUserLeagues] = useState<League[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [sharing, setSharing] = useState(false);

  const generateTarget = useCallback((): BatakTarget => {
    const position = Math.floor(Math.random() * (gridSize.cols * gridSize.rows));
    return { id: Date.now(), position };
  }, [gridSize]);

  const startGame = useCallback(() => {
    haptic("selection");
    setGameState("playing");
    setScore(0);
    setTimeLeft(30);
    setTargets([generateTarget()]);
    setHitEffects([]);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState("result");
          haptic("success");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [generateTarget]);

  const handleTargetClick = useCallback(
    (targetId: number, event: React.MouseEvent) => {
      haptic("light");
      setScore((prev) => prev + 1);

      // Get click position relative to grid for particle effect
      if (gridRef.current) {
        const rect = gridRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        setHitEffects((prev) => [...prev.slice(-5), { id: Date.now(), x, y }]);
      }

      const target = targets.find((t) => t.id === targetId);
      if (target) setLastHitCell(target.position);
      setTimeout(() => setLastHitCell(null), 200);

      setTargets([generateTarget()]);
    },
    [generateTarget, targets],
  );

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState("idle");
    setScore(0);
    setTimeLeft(30);
    setTargets([]);
    setHitEffects([]);
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(score, 30, isTraining);
      resetGame();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getResultGrade = (s: number) => {
    if (s >= 40) return { label: "INCROYABLE!", color: "text-emerald-400", bg: "from-emerald-500/30 to-emerald-700/10", grade: "S+" };
    if (s >= 35) return { label: "Excellent!", color: "text-green-400", bg: "from-green-500/30 to-green-700/10", grade: "S" };
    if (s >= 30) return { label: "Très bien!", color: "text-cyan-400", bg: "from-cyan-500/30 to-cyan-700/10", grade: "A" };
    if (s >= 25) return { label: "Bien!", color: "text-blue-400", bg: "from-blue-500/30 to-blue-700/10", grade: "B" };
    if (s >= 20) return { label: "Correct", color: "text-yellow-400", bg: "from-yellow-500/30 to-yellow-700/10", grade: "C" };
    return { label: "À améliorer", color: "text-orange-400", bg: "from-orange-500/30 to-orange-700/10", grade: "D" };
  };

  const getTimerUrgency = () => {
    if (timeLeft <= 5) return "text-red-500";
    if (timeLeft <= 10) return "text-orange-400";
    return "text-cyan-400";
  };

  const fetchUserLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const data = await api.leagues.my();
      setUserLeagues((data || []) as unknown as League[]);
    } catch (error: unknown) {
      console.error("Error fetching leagues:", error);
      setUserLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const handleOpenShareModal = () => {
    fetchUserLeagues();
    setShowShareModal(true);
  };

  const handleShareToLeague = async (leagueId: number, leagueName: string) => {
    setSharing(true);
    try {
      const message = `🎯 J'ai fait ${score} cibles au Batak Pro ! ${getResultGrade(score).label} Qui peut faire mieux ?`;
      await api.chat.send(String(leagueId), { content: message });
      toast.success(`Score partagé dans ${leagueName} !`);
      setShowShareModal(false);
    } catch (error: unknown) {
      toast.error("Erreur lors du partage");
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div
      className="relative glass-card rounded-2xl border border-white/10 overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      {/* Header */}
      <div className="relative p-5 pb-3">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-heading text-base uppercase text-white tracking-wide">
                Batak Pro
              </h3>
              {isTraining && (
                <span className="font-body text-[10px] text-orange-400 uppercase tracking-wider">
                  Entraînement
                </span>
              )}
            </div>
          </motion.div>
          {!isTraining && attemptsRemaining !== undefined && (
            <motion.div
              className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <span className="font-data text-sm text-cyan-400">{attemptsRemaining}/3</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Timer + Score HUD */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-2.5 border border-white/5">
          <motion.div
            className="flex items-center gap-2"
            animate={timeLeft <= 5 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeLeft <= 5 ? Infinity : 0 }}
          >
            <Timer className={`w-5 h-5 ${getTimerUrgency()}`} />
            <span className={`font-data text-2xl ${getTimerUrgency()} tabular-nums`}>
              {timeLeft}
              <span className="text-sm opacity-60">s</span>
            </span>
          </motion.div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <motion.span
              key={score}
              className="font-data text-2xl text-yellow-500 tabular-nums"
              initial={score > 0 ? { scale: 1.3, color: "#22d3ee" } : {}}
              animate={{ scale: 1, color: "#eab308" }}
              transition={{ duration: 0.3 }}
            >
              {score}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Target Grid */}
      <div className="px-5 pb-3">
        <div
          ref={gridRef}
          className="relative grid grid-cols-4 gap-2"
          style={{ perspective: "800px" }}
        >
          {Array.from({ length: gridSize.cols * gridSize.rows }).map((_, i) => {
            const target = targets.find((t) => t.position === i);
            const wasHit = lastHitCell === i;

            return (
              <motion.button
                key={i}
                onClick={(e) => target && handleTargetClick(target.id, e)}
                disabled={gameState !== "playing"}
                className={`relative h-14 sm:h-16 rounded-xl transition-colors ${
                  target
                    ? "bg-gradient-to-b from-cyan-400/90 to-cyan-600/90 border-2 border-cyan-300/80 shadow-[0_0_20px_#22d3ee50]"
                    : wasHit
                      ? "bg-cyan-500/20 border-2 border-cyan-500/30"
                      : "bg-white/[0.03] border-2 border-white/5 hover:border-white/10"
                }`}
                animate={
                  target
                    ? { scale: [0.8, 1.05, 1], rotateX: [10, 0] }
                    : wasHit
                      ? { scale: [0.9, 1] }
                      : {}
                }
                transition={{ duration: 0.25, type: "spring", stiffness: 400 }}
                whileTap={target ? { scale: 0.85 } : {}}
              >
                {/* Target glow ring */}
                {target && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-cyan-300"
                    animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                )}
                {/* Inner dot for active target */}
                {target && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <div className="w-4 h-4 rounded-full bg-white/80 shadow-[0_0_10px_#fff]" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}

          {/* Hit particle effects overlaid on grid */}
          <AnimatePresence>
            {hitEffects.map((effect) => (
              <HitEffect key={effect.id} x={effect.x} y={effect.y} />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions */}
      <div className="p-5 pt-2">
        <AnimatePresence mode="wait">
          {gameState === "idle" && (
            <motion.div
              key="start"
              className="text-center space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="font-body text-gray-500 text-sm">
                Clique sur les cibles le plus vite possible !
              </p>
              <Button
                onClick={startGame}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading text-base rounded-xl relative overflow-hidden group"
                disabled={!isTraining && attemptsRemaining === 0}
                data-testid="batak-start-btn"
              >
                <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <Play className="w-5 h-5 mr-2" /> DÉMARRER (30s)
              </Button>
            </motion.div>
          )}

          {gameState === "result" && (
            <motion.div
              key="result"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Result display */}
              <motion.div
                className="text-center py-4"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${getResultGrade(score).bg} mb-2`}
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                >
                  <span className={`font-heading text-xs uppercase ${getResultGrade(score).color}`}>
                    {getResultGrade(score).grade}
                  </span>
                </motion.div>
                <motion.p
                  className={`font-data text-5xl ${getResultGrade(score).color}`}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {score}
                  <span className="text-lg ml-1 opacity-70">cibles</span>
                </motion.p>
                <p className="font-heading text-sm mt-1 text-white/80">
                  {getResultGrade(score).label}
                </p>
              </motion.div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={resetGame}
                  className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-heading rounded-xl"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Réessayer
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading rounded-xl"
                  disabled={!isTraining && attemptsRemaining === 0}
                >
                  <Trophy className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              </div>
              <Button
                onClick={handleOpenShareModal}
                className="w-full h-11 bg-white/5 border border-green-500/30 hover:bg-green-500/10 text-green-400 font-heading rounded-xl"
                data-testid="batak-share-btn"
              >
                <Share2 className="w-4 h-4 mr-2" /> Partager dans une ligue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="glass-card border border-cyan-500/20 rounded-2xl max-w-md w-full p-6 relative"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-lg text-white">Partager mon score</h3>
                  <p className="font-body text-xs text-gray-400">
                    <span className="text-cyan-400 font-data">{score} cibles</span> — {getResultGrade(score).label}
                  </p>
                </div>
              </div>

              {loadingLeagues ? (
                <div className="text-center py-8">
                  <motion.div
                    className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <p className="text-gray-500 text-sm mt-3">Chargement...</p>
                </div>
              ) : userLeagues.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucune ligue rejointe</p>
                </div>
              ) : (
                <motion.div
                  className="space-y-2 max-h-60 overflow-y-auto"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
                >
                  {userLeagues.map((league) => (
                    <motion.button
                      key={league.id}
                      onClick={() => handleShareToLeague(league.id, league.name)}
                      disabled={sharing}
                      className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex items-center justify-between group"
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 },
                      }}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span className="font-heading text-sm text-white group-hover:text-cyan-400 transition-colors">
                        {league.name}
                      </span>
                      <Share2 className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
