import { useState, useCallback, useRef } from "react";
import { Zap, Trophy, RotateCcw, Play } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type ReactionGameState = "idle" | "waiting" | "ready" | "go" | "result" | "false_start";

interface ReactionGameProps {
  onSubmit?: (reactionTime: number, isTraining: boolean) => Promise<void>;
  attemptsRemaining?: number;
  isTraining?: boolean;
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
      lightIndex++;

      if (lightIndex >= 5) {
        clearInterval(lightInterval);
        setGameState("ready");
        const delay = 1000 + Math.random() * 3000;
        timeoutRef.current = setTimeout(() => {
          setLights([false, false, false, false, false]);
          setGameState("go");
          setStartTime(Date.now());
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
    } else if (gameState === "waiting" || gameState === "ready") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState("false_start");
      setReactionTime(null);
    }
  }, [gameState, startTime]);

  const handleSubmit = async () => {
    if (reactionTime && onSubmit) {
      await onSubmit(reactionTime, isTraining);
      resetGame();
    }
  };

  const getResultColor = (time: number): string => {
    if (time < 200) return "text-green-400";
    if (time < 300) return "text-yellow-400";
    if (time < 400) return "text-orange-400";
    return "text-red-400";
  };

  const getResultMessage = (time: number): string => {
    if (time < 150) return "INCROYABLE! 🔥";
    if (time < 200) return "Excellent! ⚡";
    if (time < 250) return "Très bien! 👍";
    if (time < 300) return "Bien! 👌";
    if (time < 400) return "Correct";
    return "À améliorer";
  };

  return (
    <Card className="game-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg uppercase text-orange-500 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Reaction Time
          {isTraining && <span className="text-xs text-cyan-400 ml-2">(Entraînement)</span>}
        </CardTitle>
        {!isTraining && attemptsRemaining !== undefined && (
          <p className="font-body text-sm text-gray-400">
            Essais restants: <span className="text-orange-400">{attemptsRemaining}</span>/3
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-center gap-2">
          {lights.map((lit, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-full border-4 transition-all duration-200 ${lit ? "bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]" : "bg-gray-800 border-gray-600"}`}
            />
          ))}
        </div>

        <div
          className={`h-32 rounded-lg flex items-center justify-center cursor-pointer transition-all ${
            gameState === "go"
              ? "bg-green-500/20 border-2 border-green-500 animate-pulse"
              : gameState === "false_start"
                ? "bg-red-500/20 border-2 border-red-500"
                : "bg-gray-800/50 border-2 border-gray-700"
          }`}
          onClick={handleClick}
        >
          {gameState === "idle" && (
            <p className="font-heading text-gray-400 text-center">
              Cliquer sur DÉMARRER pour commencer
            </p>
          )}
          {gameState === "waiting" && (
            <p className="font-heading text-yellow-500 text-center animate-pulse">
              Attendez les feux...
            </p>
          )}
          {gameState === "ready" && (
            <p className="font-heading text-red-500 text-center animate-pulse">
              PRÊT... Attendez l'extinction!
            </p>
          )}
          {gameState === "go" && (
            <p className="font-heading text-2xl text-green-400 text-center">GO! CLIQUEZ!</p>
          )}
          {gameState === "false_start" && (
            <div className="text-center">
              <p className="font-heading text-2xl text-red-500">FAUX DÉPART!</p>
              <p className="font-body text-gray-400 text-sm mt-2">Vous avez cliqué trop tôt</p>
            </div>
          )}
          {gameState === "result" && (
            <div className="text-center">
              <p className={`font-data text-4xl ${getResultColor(reactionTime!)}`}>
                {reactionTime} ms
              </p>
              <p className="font-heading text-lg mt-2">{getResultMessage(reactionTime!)}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {gameState === "idle" && (
            <Button
              onClick={startSequence}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-heading h-12 text-base"
              disabled={!isTraining && attemptsRemaining === 0}
              data-testid="reaction-start-btn"
            >
              <Play className="w-5 h-5 mr-2" /> DÉMARRER
            </Button>
          )}
          {(gameState === "false_start" || gameState === "result") && (
            <>
              <Button
                onClick={resetGame}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white h-12"
              >
                <RotateCcw className="w-5 h-5 mr-2" /> Réessayer
              </Button>
              {gameState === "result" && (
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white h-12"
                  disabled={!isTraining && attemptsRemaining === 0}
                >
                  <Trophy className="w-5 h-5 mr-2" /> Enregistrer
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
