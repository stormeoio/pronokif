import { motion } from "framer-motion";
import { Check, Copy, Share2, Flag } from "lucide-react";
import { Button } from "../../components/ui/button";

// ------------------------------------------------------------------ types ---

export interface League {
  id: string | number;
  name: string;
  code: string;
  [key: string]: unknown;
}

export interface LeagueCreatedScreenProps {
  league: League;
  copied: string | null;
  onCopyCode: () => void;
  onShareCode: () => void;
  onDone: () => void;
}

// ----------------------------------------------------------- component ---

export default function LeagueCreatedScreen({
  league,
  copied,
  onCopyCode,
  onShareCode,
  onDone,
}: LeagueCreatedScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-app-main pb-24">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/15 rounded-full blur-[100px]" />

      <motion.div
        className="w-full max-w-md text-center relative z-10"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
      >
        <motion.div
          className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gradient-to-br from-green-500 to-green-700 border-2 border-green-400/50 mb-6 shadow-xl glow-gold"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >
          <Check className="w-10 h-10 text-white" strokeWidth={2} />
        </motion.div>

        <motion.h1
          className="font-heading text-3xl uppercase tracking-wider text-white mb-2"
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
        >
          Ligue creee !
        </motion.h1>
        <motion.p
          className="font-body text-gray-400 mb-8"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
        >
          Partage ce code avec tes amis
        </motion.p>

        <motion.div
          className="card-arcade mb-6 p-6 glass-card"
          variants={{ hidden: { opacity: 0, y: 20, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 } }}
        >
          <p className="font-body text-gray-400 text-sm mb-2">{league.name}</p>
          <div className="flex items-center justify-center gap-3">
            <span
              className="font-data text-4xl tracking-[0.3em] text-gold-glow"
              data-testid="league-code"
            >
              {league.code}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCopyCode}
              className="text-gray-400 hover:text-white hover:bg-white/10"
              data-testid="copy-code-btn"
            >
              {copied === league.code ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="flex gap-3 mb-8"
          variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } }}
        >
          <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onShareCode}
              className="w-full h-12 btn-neon font-heading uppercase tracking-wider text-sm"
              data-testid="share-code-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </motion.div>
          <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onCopyCode}
              className="w-full h-12 btn-chrome font-heading uppercase tracking-wider text-sm"
              data-testid="copy-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.02 }}
        >
          <Button
            onClick={onDone}
            className="w-full h-14 btn-racing font-heading uppercase tracking-wider relative overflow-hidden group"
            data-testid="go-dashboard-btn"
          >
            <span className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            <Flag className="w-5 h-5 mr-2" />
            Commencer a pronostiquer
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
