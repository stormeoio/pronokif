import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

// ------------------------------------------------------------------ types ---

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

// ----------------------------------------------------------- component ---

/**
 * Renders a comparison card for either Qualifications or Course results.
 * Shows the official result alongside the user's prediction.
 */
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
    <Card className="bg-card border-white/10">
      <CardHeader>
        <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winner / Pole */}
        <div className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800">
          <p className="font-body text-xs text-zinc-400 uppercase mb-2">{winnerLabel}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-heading text-white">{getDriverName(winnerId)}</span>
              <span className="font-body text-xs text-zinc-500">(Reel)</span>
            </div>
            {predictionWinnerId !== undefined && (
              <div className="flex items-center gap-2">
                <span
                  className={`font-body text-sm ${
                    predictionWinnerId === winnerId ? "text-emerald-500" : "text-zinc-400"
                  }`}
                >
                  Ton choix: {getDriverName(predictionWinnerId)}
                </span>
                {predictionWinnerId === winnerId ? (
                  <Check className="w-5 h-5 text-emerald-500" />
                ) : (
                  <X className="w-5 h-5 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top 3 */}
        {top3 && (
          <div className="p-3 rounded-sm bg-zinc-900/50 border border-zinc-800">
            <p className="font-body text-xs text-zinc-400 uppercase mb-2">Top 3</p>
            <div className="space-y-2">
              {top3.map((driverId, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-sm flex items-center justify-center font-heading text-xs ${
                        i === 0
                          ? "bg-amber-500 text-black"
                          : i === 1
                            ? "bg-zinc-300 text-black"
                            : "bg-amber-700 text-white"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-body text-white">{getDriverName(driverId)}</span>
                  </div>
                  {predictionTop3 && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const pred = predictionTop3[i];
                        return (
                          <>
                            <span
                              className={`font-body text-sm ${
                                pred === driverId
                                  ? "text-emerald-500"
                                  : predictionTop3.includes(driverId)
                                    ? "text-amber-500"
                                    : "text-zinc-400"
                              }`}
                            >
                              {pred !== undefined ? getDriverName(pred) : "—"}
                            </span>
                            {pred === driverId ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : predictionTop3.includes(driverId) ? (
                              <span className="text-amber-500 text-xs">~</span>
                            ) : (
                              <X className="w-5 h-5 text-red-500" />
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
