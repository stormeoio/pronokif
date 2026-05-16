import { Button } from "../../components/ui/button";
import { Check, Copy, Share2, Flag } from "lucide-react";

export default function LeagueCreatedScreen({
  league,
  copied,
  onCopyCode,
  onShareCode,
  onDone,
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-app-main pb-24">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/15 rounded-full blur-[100px]" />

      <div className="w-full max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-green-500 to-green-700 border-2 border-green-400/50 mb-6 shadow-xl glow-gold">
          <Check className="w-10 h-10 text-white" strokeWidth={2} />
        </div>

        <h1 className="font-heading text-3xl uppercase tracking-wider text-white mb-2">
          Ligue creee !
        </h1>
        <p className="font-body text-gray-400 mb-8">Partage ce code avec tes amis</p>

        <div className="card-arcade mb-6 p-6">
          <p className="font-body text-gray-400 text-sm mb-2">{league.name}</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-data text-4xl tracking-[0.3em] text-gold-glow" data-testid="league-code">
              {league.code}
            </span>
            <Button variant="ghost" size="icon" onClick={onCopyCode} className="text-gray-400 hover:text-white hover:bg-white/10" data-testid="copy-code-btn">
              {copied === league.code ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <Button onClick={onShareCode} className="flex-1 h-12 btn-neon font-heading uppercase tracking-wider text-sm" data-testid="share-code-btn">
            <Share2 className="w-4 h-4 mr-2" />Partager
          </Button>
          <Button onClick={onCopyCode} className="flex-1 h-12 btn-chrome font-heading uppercase tracking-wider text-sm" data-testid="copy-btn">
            <Copy className="w-4 h-4 mr-2" />Copier
          </Button>
        </div>

        <Button onClick={onDone} className="w-full h-14 btn-racing font-heading uppercase tracking-wider" data-testid="go-dashboard-btn">
          <Flag className="w-5 h-5 mr-2" />
          Commencer a pronostiquer
        </Button>
      </div>
    </div>
  );
}
