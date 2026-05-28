/**
 * ResultComparisonCard — Quali/Course result vs prediction.
 * Broadcast Premium: pk-surface card, pk-emerald/pk-red match indicators.
 */
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { staggerContainer } from "@/lib/motion";

/* ── Types ─────────────────────────────────────────────── */

export interface ResultComparisonCardProps {
  title: string;
  icon?: ReactNode;
  winnerLabel: string;
  winnerId: string | number;
  predictionWinnerId?: string | number;
  top3?: Array<string | number>;
  predictionTop3?: Array<string | number>;
  getDriverName: (id: string | number) => string;
}

/* ── Component ─────────────────────────────────────────── */

export default function ResultComparisonCard({
  title,
  icon,
  winnerLabel,
  winnerId,
  predictionWinnerId,
  top3,
  predictionTop3,
  getDriverName,
}: ResultComparisonCardProps) {
  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
        {icon}
        <h3 className="font-display text-sm">{title}</h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Winner / Pole */}
        <div className="bg-pk-anthracite/60 border border-white/[0.06] rounded-md p-3">
          <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-2">
            {winnerLabel}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm">{getDriverName(winnerId)}</span>
              <span className="font-data text-[0.5rem] text-pk-titane">(Réel)</span>
            </div>
            {predictionWinnerId !== undefined && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-data text-[0.5625rem] ${
                    predictionWinnerId === winnerId ? "text-pk-emerald" : "text-pk-titane"
                  }`}
                >
                  Ton choix : {getDriverName(predictionWinnerId)}
                </span>
                {predictionWinnerId === winnerId ? (
                  <Check className="w-4 h-4 text-pk-emerald" />
                ) : (
                  <X className="w-4 h-4 text-pk-red" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top 3 */}
        {top3 && (
          <div className="bg-pk-anthracite/60 border border-white/[0.06] rounded-md p-3">
            <p className="font-data text-[0.5625rem] text-pk-titane uppercase tracking-wider mb-2">
              Top 3
            </p>
            <motion.div
              className="space-y-1.5"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {top3.map((driverId, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between"
                  variants={{
                    hidden: { opacity: 0, x: -6 },
                    visible: { opacity: 1, x: 0 },
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-data text-[0.5625rem] font-bold ${
                        i === 0
                          ? "bg-pk-gold/[0.2] text-pk-gold"
                          : i === 1
                            ? "bg-pk-silver/[0.2] text-pk-silver"
                            : "bg-pk-bronze/[0.2] text-pk-bronze"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm">{getDriverName(driverId)}</span>
                  </div>
                  {predictionTop3 && (
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        const pred = predictionTop3[i];
                        return (
                          <>
                            <span
                              className={`font-data text-[0.5625rem] ${
                                pred === driverId
                                  ? "text-pk-emerald"
                                  : predictionTop3.includes(driverId)
                                    ? "text-pk-amber"
                                    : "text-pk-titane"
                              }`}
                            >
                              {pred !== undefined ? getDriverName(pred) : "—"}
                            </span>
                            {pred === driverId ? (
                              <Check className="w-3.5 h-3.5 text-pk-emerald" />
                            ) : predictionTop3.includes(driverId) ? (
                              <span className="text-pk-amber font-data text-[0.5625rem]">~</span>
                            ) : (
                              <X className="w-3.5 h-3.5 text-pk-red" />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
