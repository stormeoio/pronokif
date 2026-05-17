import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, RotateCcw, Play } from "lucide-react";
import { Button } from "../ui/button";
import { haptic } from "@/lib/haptics";

type ReactionGameState = "idle" | "waiting" | "ready" | "go" | "result" | "false_start";

interface ReactionGameProps {
  onSubmit?: (reactionTime: number, isTraining: boolean) => Promise<void>;
  attemptsRemaining?: number;
  isTraining?: boolean;
}

// Particle burst on GO
function ParticleBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        angle: (i / 20) * Math.PI * 2,
        distance: 40 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 0.1,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-1/2 left-1/2 rounded-full bg-green-400"
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function ReactionGame({
  onSubmit,
  attemptsRemaining,
  isTraining = false,
}: ReactionGameProps) {
  const [gameState, setGameState] = useState<ReactionGameState>("idle");
  const [lights, setLights] = useState([false, false, false, false, false]);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetGame = useCallback(() => {
    setGameState("idle");
    setLights([false, false, false, false, false]);
    setReactionTime(null);
    setStartTime(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const startSequence = useCallback(() => {
    haptic("selection");
    setGameState("waiting");
    setLights([false, false, false, false, false]);
    setReactionTime(null);

    let lightIndex = 0;
    const lightInterval = setInterval(() => {
      setLights((prev) => {
        const newLights = [...prev];
        newLights[lightIndex] = true;
        return newLights;
      });
      haptic("light");
      lightIndex++;

      if (lightIndex >= 5) {
        clearInterval(lightInterval);
        setGameState("ready");
        const delay = 1000 + Math.random() * 3000;
        timeoutRef.current = setTimeout(() => {
          setLights([false, false, false, false, false]);
          setGameState("go");
          setStartTime(Date.now());
          haptic("success");
        }, delay);
      }
    }, 800);

    return () => clearInterval(lightInterval);
  }, []);

  const handleClick = useCallback(() => {
    if (gameState === "go" && startTime !== null) {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setGameState("result");
      haptic("success");
    } else if (gameState === "waiting" || gameState === "ready") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState("false_start");
      setReactionTime(null);
      haptic("error");
    }
  }, [gameState, startTime]);

  const handleSubmit = async () => {
    if (reactionTime && onSubmit) {
      await onSubmit(reactionTime, isTraining);
      resetGame();
    }
  };

  const getResultGrade = (time: number) => {
    if (time < 150) return { label: "INCROYABLE!", color: "text-emerald-400", bg: "from-emerald-500/30 to-emerald-700/10", grade: "S+" };
    if (time < 200) return { label: "Excellent!", color: "text-green-400", bg: "from-green-500/30 to-green-700/10", grade: "S" };
    if (time < 250) return { label: "Très bien!", color: "text-cyan-400", bg: "from-cyan-500/30 to-cyan-700/10", grade: "A" };
    if (time < 300) return { label: "Bien!", color: "text-blue-400", bg: "from-blue-500/30 to-blue-700/10", grade: "B" };
    if (time < 400) return { label: "Correct", color: "text-yellow-400", bg: "from-yellow-500/30 to-yellow-700/10", grade: "C" };
    return { label: "À améliorer", color: "text-orange-400", bg: "from-orange-500/30 to-orange-700/10", grade: "D" };
  };

  return (
    <motion.div
      className="relative glass-card rounded-2xl border border-white/10 overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none" />

      {/* Header */}
      <div className="relative p-5 pb-3">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-heading text-base uppercase text-white tracking-wide">
                Reaction Time
              </h3>
              {isTraining && (
                <span className="font-body text-[10px] text-cyan-400 uppercase tracking-wider">
                  Entraînement
                </span>
              )}
            </div>
          </motion.div>
          {!isTraining && attemptsRemaining !== undefined && (
            <motion.div
              className="bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <span className="font-data text-sm text-orange-400">{attemptsRemaining}/3</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* F1 Starting Lights */}
      <div className="px-5 py-4">
        <div className="flex justify-center gap-3" style={{ perspective: "600px" }}>
          {lights.map((lit, i) => (
            <motion.div
              key={i}
              className="relative"
              initial={{ rotateX: 0 }}
              animate={lit ? { rotateX: [0, -10, 0], scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {/* Light housing */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-900 border-2 border-gray-600 flex items-center justify-center shadow-inner">
                <motion.div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                  animate={{
                    backgroundColor: lit ? "#ef4444" : "#1f2937",
                    boxShadow: lit
                      ? "0 0 30px #ef4444, 0 0 60px #ef444480, inset 0 -2px 4px #dc2626"
                      : "inset 0 2px 4px #000",
                  }}
                  transition={{ duration: 0.15 }}
                />
              </div>
              {/* Reflection */}
              {lit && (
                <motion.div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-2 bg-red-500/40 rounded-full blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Click Zone */}
      <div className="px-5 pb-2">
        <motion.div
          className={`relative h-36 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${
            gameState === "go"
              ? "bg-green-500/10 border-2 border-green-500/60"
              : gameState === "false_start"
                ? "bg-red-500/10 border-2 border-red-500/60"
                : "bg-white/[0.03] border-2 border-white/10"
          }`}
          onClick={handleClick}
          whileTap={gameState === "go" ? { scale: 0.97 } : {}}
        >
          {/* Background pulse for GO */}
          {gameState === "go" && (
            <motion.div
              className="absolute inset-0 bg-green-500/20"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}

          {/* Particle burst on GO */}
          <AnimatePresence>
            {gameState === "go" && <ParticleBurst />}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {gameState === "idle" && (
              <motion.p
                key="idle"
                className="font-body text-gray-500 text-sm text-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Appuie sur DÉMARRER pour lancer la séquence
              </motion.p>
            )}
            {gameState === "waiting" && (
              <motion.p
                key="waiting"
                className="font-heading text-yellow-500 text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.5, 1, 0.5], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ opacity: { duration: 1.5, repeat: Infinity } }}
              >
                Attendez les feux...
              </motion.p>
            )}
            {gameState === "ready" && (
              <motion.div
                key="ready"
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.p
                  className="font-heading text-red-500 text-lg"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  PRÊT...
                </motion.p>
                <p className="font-body text-xs text-gray-500 mt-1">Attendez l'extinction !</p>
              </motion.div>
            )}
            {gameState === "go" && (
              <motion.div
                key="go"
                className="text-center z-10"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <p className="font-heading text-4xl text-green-400 text-glow-cyan">GO!</p>
                <p className="font-body text-xs text-green-300/70 mt-1">CLIQUEZ MAINTENANT</p>
              </motion.div>
            )}
            {gameState === "false_start" && (
              <motion.div
                key="false"
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring" }}
              >
                <motion.p
                  className="font-heading text-2xl text-red-500"
                  animate={{ x: [-3, 3, -3, 3, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  FAUX DÉPART!
                </motion.p>
                <p className="font-body text-gray-500 text-xs mt-2">Trop tôt !</p>
              </motion.div>
            )}
            {gameState === "result" && reactionTime !== null && (
              <motion.div
                key="result"
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div
                  className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${getResultGrade(reactionTime).bg} mb-2`}
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                >
                  <span className={`font-heading text-xs uppercase ${getResultGrade(reactionTime).color}`}>
                    {getResultGrade(reactionTime).grade}
                  </span>
                </motion.div>
                <motion.p
                  className={`font-data text-5xl ${getResultGrade(reactionTime).color}`}
                  initial={{ scale: 1.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {reactionTime}
                  <span className="text-lg ml-1 opacity-70">ms</span>
                </motion.p>
                <p className="font-heading text-sm mt-1 text-white/80">
                  {getResultGrade(reactionTime).label}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="p-5 pt-3">
        <AnimatePresence mode="wait">
          {gameState === "idle" && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                onClick={startSequence}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-heading text-base rounded-xl relative overflow-hidden group"
                disabled={!isTraining && attemptsRemaining === 0}
                data-testid="reaction-start-btn"
              >
                <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <Play className="w-5 h-5 mr-2" /> DÉMARRER
              </Button>
            </motion.div>
          )}
          {(gameState === "false_start" || gameState === "result") && (
            <motion.div
              key="actions"
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Button
                onClick={resetGame}
                className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-heading rounded-xl"
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Réessayer
              </Button>
              {gameState === "result" && (
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-heading rounded-xl"
                  disabled={!isTraining && attemptsRemaining === 0}
                >
                  <Trophy className="w-4 h-4 mr-2" /> Enregistrer
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
