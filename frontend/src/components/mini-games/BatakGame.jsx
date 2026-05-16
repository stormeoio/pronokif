import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Trophy, Timer, RotateCcw, Play, Target, Share2, X, MessageCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

export function BatakGame({ onSubmit, attemptsRemaining, isTraining = false }) {
  const [gameState, setGameState] = useState("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targets, setTargets] = useState([]);
  const [gridSize] = useState({ cols: 4, rows: 3 });
  const timerRef = useRef(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [userLeagues, setUserLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [sharing, setSharing] = useState(false);

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
        if (prev <= 1) { clearInterval(timerRef.current); setGameState("result"); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [generateTarget]);

  const handleTargetClick = useCallback((targetId) => {
    setScore(prev => prev + 1);
    setTargets([generateTarget()]);
  }, [generateTarget]);

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState("idle"); setScore(0); setTimeLeft(30); setTargets([]);
  };

  const handleSubmit = async () => {
    if (onSubmit) { await onSubmit(score, 30, isTraining); resetGame(); }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const getResultMessage = (s) => {
    if (s >= 40) return "INCROYABLE! 🔥";
    if (s >= 35) return "Excellent! ⚡";
    if (s >= 30) return "Très bien! 👍";
    if (s >= 25) return "Bien! 👌";
    if (s >= 20) return "Correct";
    return "À améliorer";
  };

  const fetchUserLeagues = async () => {
    setLoadingLeagues(true);
    try { const res = await apiClient.get("/leagues/my"); setUserLeagues(res.data || []); }
    catch (e) { console.error("Error fetching leagues:", e); setUserLeagues([]); }
    finally { setLoadingLeagues(false); }
  };

  const handleOpenShareModal = () => { fetchUserLeagues(); setShowShareModal(true); };

  const handleShareToLeague = async (leagueId, leagueName) => {
    setSharing(true);
    try {
      const message = `🎯 J'ai fait ${score} cibles au Batak Pro ! ${getResultMessage(score)} Qui peut faire mieux ?`;
      await apiClient.post(`/leagues/${leagueId}/messages`, { content: message });
      toast.success(`Score partagé dans ${leagueName} !`);
      setShowShareModal(false);
    } catch (e) { toast.error("Erreur lors du partage"); }
    finally { setSharing(false); }
  };

  return (
    <Card className="game-card">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg uppercase text-cyan-400 flex items-center gap-2">
          <Target className="w-5 h-5" /> Batak Pro
          {isTraining && <span className="text-xs text-orange-400 ml-2">(Entraînement)</span>}
        </CardTitle>
        {!isTraining && attemptsRemaining !== undefined && (
          <p className="font-body text-sm text-gray-400">Essais restants: <span className="text-cyan-400">{attemptsRemaining}</span>/3</p>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Timer className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500' : 'text-cyan-400'}`} />
            <span className={`font-data text-2xl ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-data text-2xl text-yellow-500">{score}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: gridSize.cols * gridSize.rows }).map((_, i) => {
            const target = targets.find(t => t.position === i);
            return (
              <button key={i} onClick={() => target && handleTargetClick(target.id)} disabled={gameState !== "playing"}
                className={`h-14 sm:h-16 rounded-lg transition-all ${target ? "bg-gradient-to-b from-cyan-400 to-cyan-600 border-2 border-cyan-300 shadow-[0_0_15px_#22d3ee] animate-pulse" : "bg-gray-800 border-2 border-gray-700"}`} />
            );
          })}
        </div>

        {gameState === "idle" && (
          <div className="text-center py-2">
            <p className="font-body text-gray-400 text-sm mb-3">Clique sur les cibles le plus vite possible !</p>
            <Button onClick={startGame}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading h-12 text-base"
              disabled={!isTraining && attemptsRemaining === 0} data-testid="batak-start-btn">
              <Play className="w-5 h-5 mr-2" /> DÉMARRER (30s)
            </Button>
          </div>
        )}

        {gameState === "result" && (
          <>
            <div className="text-center py-4">
              <p className="font-data text-4xl text-cyan-400">{score} cibles</p>
              <p className="font-heading text-lg mt-2">{getResultMessage(score)}</p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <Button onClick={resetGame} className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white h-12">
                  <RotateCcw className="w-5 h-5 mr-2" /> Réessayer
                </Button>
                <Button onClick={handleSubmit}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white h-12"
                  disabled={!isTraining && attemptsRemaining === 0}>
                  <Trophy className="w-5 h-5 mr-2" /> Enregistrer
                </Button>
              </div>
              <Button onClick={handleOpenShareModal}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white h-12"
                data-testid="batak-share-btn">
                <Share2 className="w-5 h-5 mr-2" /> Partager dans une ligue
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border-2 border-cyan-500/30 rounded-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-heading text-xl text-cyan-400 mb-2 flex items-center gap-2"><Share2 className="w-5 h-5" /> Partager mon score</h3>
            <p className="font-body text-gray-400 text-sm mb-4">Score: <span className="text-cyan-400 font-data">{score} cibles</span> - {getResultMessage(score)}</p>
            {loadingLeagues ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 mt-2">Chargement des ligues...</p>
              </div>
            ) : userLeagues.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">Tu n'as rejoint aucune ligue</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {userLeagues.map((league) => (
                  <button key={league.id} onClick={() => handleShareToLeague(league.id, league.name)} disabled={sharing}
                    className="w-full p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all flex items-center justify-between group">
                    <span className="font-heading text-white group-hover:text-cyan-400">{league.name}</span>
                    <Share2 className="w-4 h-4 text-gray-500 group-hover:text-cyan-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
