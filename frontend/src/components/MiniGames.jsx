import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Zap, Trophy, Timer, RotateCcw, Play } from "lucide-react";

// F1 Lights Out Reaction Game
export function ReactionGame({ onSubmit, attemptsRemaining, isTraining = false }) {
  const [gameState, setGameState] = useState("idle"); // idle, waiting, ready, go, result, false_start
  const [lights, setLights] = useState([false, false, false, false, false]);
  const [reactionTime, setReactionTime] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const timeoutRef = useRef(null);

  const resetGame = useCallback(() => {
    setGameState("idle");
    setLights([false, false, false, false, false]);
    setReactionTime(null);
    setStartTime(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const startSequence = useCallback(() => {
    setGameState("waiting");
    setLights([false, false, false, false, false]);
    setReactionTime(null);

    // Light up sequence - one by one
    let lightIndex = 0;
    const lightInterval = setInterval(() => {
      setLights(prev => {
        const newLights = [...prev];
        newLights[lightIndex] = true;
        return newLights;
      });
      lightIndex++;
      
      if (lightIndex >= 5) {
        clearInterval(lightInterval);
        setGameState("ready");
        
        // Random delay between 1-4 seconds before lights out
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
    if (gameState === "go") {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setGameState("result");
    } else if (gameState === "waiting" || gameState === "ready") {
      // False start!
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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

  const getResultColor = (time) => {
    if (time < 200) return "text-green-400";
    if (time < 300) return "text-yellow-400";
    if (time < 400) return "text-orange-400";
    return "text-red-400";
  };

  const getResultMessage = (time) => {
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
          <Zap className="w-5 h-5" />
          Reaction Time
          {isTraining && <span className="text-xs text-cyan-400 ml-2">(Entraînement)</span>}
        </CardTitle>
        {!isTraining && attemptsRemaining !== undefined && (
          <p className="font-body text-sm text-gray-400">
            Essais restants: <span className="text-orange-400">{attemptsRemaining}</span>/3
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* F1 Lights */}
        <div className="flex justify-center gap-2">
          {lights.map((lit, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-full border-4 transition-all duration-200 ${
                lit 
                  ? "bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444]" 
                  : "bg-gray-800 border-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Game area */}
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
            <p className="font-heading text-2xl text-green-400 text-center">
              GO! CLIQUEZ!
            </p>
          )}
          {gameState === "false_start" && (
            <div className="text-center">
              <p className="font-heading text-2xl text-red-500">FAUX DÉPART!</p>
              <p className="font-body text-gray-400 text-sm mt-2">Vous avez cliqué trop tôt</p>
            </div>
          )}
          {gameState === "result" && (
            <div className="text-center">
              <p className={`font-data text-4xl ${getResultColor(reactionTime)}`}>
                {reactionTime} ms
              </p>
              <p className="font-heading text-lg mt-2">{getResultMessage(reactionTime)}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {gameState === "idle" && (
            <Button 
              onClick={startSequence} 
              className="flex-1 btn-gaming h-12"
              disabled={!isTraining && attemptsRemaining === 0}
            >
              <Play className="w-5 h-5 mr-2" />
              DÉMARRER
            </Button>
          )}
          {(gameState === "false_start" || gameState === "result") && (
            <>
              <Button onClick={resetGame} variant="outline" className="flex-1 h-12">
                <RotateCcw className="w-5 h-5 mr-2" />
                Réessayer
              </Button>
              {gameState === "result" && (
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1 btn-gaming h-12"
                  disabled={!isTraining && attemptsRemaining === 0}
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Enregistrer
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Batak Speed Game
export function BatakGame({ onSubmit, attemptsRemaining, isTraining = false }) {
  const [gameState, setGameState] = useState("idle"); // idle, playing, result
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState([]);
  const [gridSize] = useState({ cols: 4, rows: 3 });
  const timerRef = useRef(null);

  const generateTarget = useCallback(() => {
    const position = Math.floor(Math.random() * (gridSize.cols * gridSize.rows));
    return { id: Date.now(), position };
  }, [gridSize]);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(30);
    setTargets([generateTarget()]);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [generateTarget]);

  const handleTargetClick = useCallback((targetId) => {
    setScore(prev => prev + 1);
    setTargets([generateTarget()]);
  }, [generateTarget]);

  const resetGame = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState("idle");
    setScore(0);
    setTimeLeft(30);
    setTargets([]);
  };

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(score, 30, isTraining);
      resetGame();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getResultMessage = (s) => {
    if (s >= 40) return "INCROYABLE! 🔥";
    if (s >= 35) return "Excellent! ⚡";
    if (s >= 30) return "Très bien! 👍";
    if (s >= 25) return "Bien! 👌";
    if (s >= 20) return "Correct";
    return "À améliorer";
  };

  return (
    <Card className="game-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg uppercase text-cyan-400 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Batak Pro
          {isTraining && <span className="text-xs text-orange-400 ml-2">(Entraînement)</span>}
        </CardTitle>
        {!isTraining && attemptsRemaining !== undefined && (
          <p className="font-body text-sm text-gray-400">
            Essais restants: <span className="text-cyan-400">{attemptsRemaining}</span>/3
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Timer and Score */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500' : 'text-cyan-400'}`} />
            <span className={`font-data text-2xl ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-data text-2xl text-yellow-500">{score}</span>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-4 gap-2 aspect-[4/3]">
          {Array.from({ length: gridSize.cols * gridSize.rows }).map((_, i) => {
            const target = targets.find(t => t.position === i);
            return (
              <button
                key={i}
                onClick={() => target && handleTargetClick(target.id)}
                disabled={gameState !== "playing"}
                className={`aspect-square rounded-lg transition-all ${
                  target
                    ? "bg-gradient-to-b from-cyan-400 to-cyan-600 border-2 border-cyan-300 shadow-[0_0_15px_#22d3ee] animate-pulse"
                    : "bg-gray-800 border-2 border-gray-700"
                }`}
              />
            );
          })}
        </div>

        {/* Result overlay */}
        {gameState === "result" && (
          <div className="text-center py-4">
            <p className="font-data text-4xl text-cyan-400">{score} cibles</p>
            <p className="font-heading text-lg mt-2">{getResultMessage(score)}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {gameState === "idle" && (
            <Button 
              onClick={startGame} 
              className="flex-1 btn-gaming-blue h-12"
              disabled={!isTraining && attemptsRemaining === 0}
            >
              <Play className="w-5 h-5 mr-2" />
              DÉMARRER (30s)
            </Button>
          )}
          {gameState === "result" && (
            <>
              <Button onClick={resetGame} variant="outline" className="flex-1 h-12">
                <RotateCcw className="w-5 h-5 mr-2" />
                Réessayer
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 btn-gaming-blue h-12"
                disabled={!isTraining && attemptsRemaining === 0}
              >
                <Trophy className="w-5 h-5 mr-2" />
                Enregistrer
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default { ReactionGame, BatakGame };
