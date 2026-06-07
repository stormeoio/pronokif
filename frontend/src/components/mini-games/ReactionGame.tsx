/**
 * ReactionGame — F1 starting lights reaction time mini-game.
 * Broadcast Premium: pk-surface card, pk-red CTA, pk-emerald/amber states.
 */
import { useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trophy, RotateCcw, Play } from "lucide-react";
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
          className="absolute top-1/2 left-1/2 rounded-full bg-pk-emerald"
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
  const { t } = useTranslation();
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
    if (time < 150)
      return {
        label: t("mini_games.grade_incredible"),
        color: "text-pk-emerald",
        bg: "from-pk-emerald/20 to-pk-emerald/5",
        grade: "S+",
      };
    if (time < 200)
      return {
        label: t("mini_games.grade_excellent"),
        color: "text-pk-emerald",
        bg: "from-pk-emerald/20 to-pk-emerald/5",
        grade: "S",
      };
    if (time < 250)
      return {
        label: t("mini_games.grade_very_good"),
        color: "text-pk-info",
        bg: "from-pk-info/20 to-pk-info/5",
        grade: "A",
      };
    if (time < 300)
      return {
        label: t("mini_games.grade_good"),
        color: "text-pk-info",
        bg: "from-pk-info/20 to-pk-info/5",
        grade: "B",
      };
    if (time < 400)
      return {
        label: t("mini_games.grade_ok"),
        color: "text-pk-amber",
        bg: "from-pk-amber/20 to-pk-amber/5",
        grade: "C",
      };
    return {
      label: t("mini_games.grade_needs_work"),
      color: "text-pk-red",
      bg: "from-pk-red/20 to-pk-red/5",
      grade: "D",
    };
  };

  return (
    <motion.div
      className="relative bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
    >
      {/* Header */}
      <div className="relative p-5 pb-3">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2"
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-9 h-9 rounded-lg bg-pk-red flex items-center justify-center shadow-glow-red">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-sm">{t("mini_games.reaction_title")}</h3>
              {isTraining && (
                <span className="font-data text-[0.5625rem] text-pk-info uppercase tracking-wider">
                  {t("mini_games.training_label")}
                </span>
              )}
            </div>
          </motion.div>
          {!isTraining && attemptsRemaining !== undefined && (
            <motion.div
              className="bg-pk-red-subtle border border-pk-red/30 px-3 py-1.5 rounded-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <span className="font-data text-sm text-pk-red">{attemptsRemaining}/3</span>
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
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-pk-carbon border-2 border-white/[0.15] flex items-center justify-center shadow-inner">
                <motion.div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
                  animate={{
                    backgroundColor: lit ? "#ff8a00" : "#121418",
                    boxShadow: lit
                      ? "0 0 30px #ff8a00, 0 0 60px #ff8a0080, inset 0 -2px 4px #e67700"
                      : "inset 0 2px 4px #000",
                  }}
                  transition={{ duration: 0.15 }}
                />
              </div>
              {/* Reflection */}
              {lit && (
                <motion.div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-2 bg-[#ff8a00]/40 rounded-full blur-sm"
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
          className={`relative h-36 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden transition-colors ${
            gameState === "go"
              ? "bg-pk-emerald/[0.08] border-2 border-pk-emerald/40"
              : gameState === "false_start"
                ? "bg-pk-red-subtle border-2 border-pk-red/40"
                : "bg-white/[0.03] border-2 border-white/[0.08]"
          }`}
          onClick={handleClick}
          whileTap={gameState === "go" ? { scale: 0.97 } : {}}
        >
          {/* Acceleration zone label */}
          <span className="pointer-events-none absolute left-2 top-2 z-10 font-data text-[0.5rem] uppercase tracking-[0.14em] text-pk-titane/70">
            {t("mini_games.acceleration_zone", "Zone d'accélération")}
          </span>

          {/* Background pulse for GO */}
          {gameState === "go" && (
            <motion.div
              className="absolute inset-0 bg-pk-emerald/10"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          )}

          {/* Particle burst on GO */}
          <AnimatePresence>{gameState === "go" && <ParticleBurst />}</AnimatePresence>

          <AnimatePresence mode="wait">
            {gameState === "idle" && (
              <motion.p
                key="idle"
                className="text-sm text-pk-titane text-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {t("mini_games.reaction_idle")}
              </motion.p>
            )}
            {gameState === "waiting" && (
              <motion.p
                key="waiting"
                className="font-display text-sm text-pk-amber text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.5, 1, 0.5], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ opacity: { duration: 1.5, repeat: Infinity } }}
              >
                {t("mini_games.reaction_waiting")}
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
                  className="font-display text-lg text-pk-red"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  {t("mini_games.reaction_ready")}
                </motion.p>
                <p className="text-xs text-pk-titane mt-1">
                  {t("mini_games.reaction_wait_lights_out")}
                </p>
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
                <p className="font-display text-4xl text-pk-emerald">
                  {t("mini_games.reaction_go")}
                </p>
                <p className="text-xs text-pk-emerald/70 mt-1">
                  {t("mini_games.reaction_click_now")}
                </p>
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
                  className="font-display text-2xl text-pk-red"
                  animate={{ x: [-3, 3, -3, 3, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  {t("mini_games.reaction_false_start")}
                </motion.p>
                <p className="text-xs text-pk-titane mt-2">{t("mini_games.reaction_too_early")}</p>
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
                  <span className={`font-display text-xs ${getResultGrade(reactionTime).color}`}>
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
                <p className="font-display text-sm mt-1 text-white/80">
                  {getResultGrade(reactionTime).label}
                </p>
                {reactionTime < 150 && (
                  <motion.p
                    className="mt-1.5 inline-block rounded-full border border-pk-emerald/30 bg-pk-emerald/10 px-2.5 py-0.5 font-display text-[0.625rem] uppercase tracking-[0.1em] text-pk-emerald"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
                  >
                    {t("mini_games.perfect_start", "Démarrage parfait")}
                  </motion.p>
                )}
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
              <button
                onClick={startSequence}
                className="w-full h-11 rounded-lg bg-pk-red text-white font-display text-sm shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={!isTraining && attemptsRemaining === 0}
                data-testid="reaction-start-btn"
              >
                <Play className="w-5 h-5" /> {t("mini_games.start")}
              </button>
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
              <button
                onClick={resetGame}
                className="flex-1 h-11 rounded-lg border border-white/[0.08] text-pk-titane font-display text-xs hover:text-pk-piste hover:border-white/[0.15] transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> {t("mini_games.retry")}
              </button>
              {gameState === "result" && (
                <button
                  onClick={handleSubmit}
                  className="flex-1 h-11 rounded-lg bg-pk-red text-white font-display text-xs shadow-glow-red active:scale-[0.97] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={!isTraining && attemptsRemaining === 0}
                >
                  <Trophy className="w-4 h-4" /> {t("mini_games.save")}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
