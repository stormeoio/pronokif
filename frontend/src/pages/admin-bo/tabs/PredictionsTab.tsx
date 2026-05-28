/**
 * Admin predictions tab — recent prediction submissions.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";

type Prediction = Record<string, unknown>;

const DISPLAY_FIELDS = [
  "winner_driver",
  "winner",
  "pole_driver",
  "pole",
  "driver_id",
  "p1",
  "selected_driver",
];

function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function predictionSummary(prediction: Prediction) {
  for (const field of DISPLAY_FIELDS) {
    const value = prediction[field];
    if (value) return String(value);
  }
  return "Détails disponibles dans la course";
}

export default function PredictionsTab() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bo", "predictions", page],
    queryFn: () => adminApi.predictions.list({ skip: page * limit, limit }),
  });

  const predictions = data?.predictions ?? [];
  const total = data?.total ?? 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Pickstics</h2>
        <span className="font-data text-sm text-gray-500">{total} au total</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : predictions.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <BarChart3 className="mx-auto mb-3 h-12 w-12 text-gray-600" />
          <p className="font-body text-gray-500">Aucun pronostic enregistré</p>
        </div>
      ) : (
        <div className="card-arcade overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 font-body text-xs uppercase text-gray-500">
                  <th className="p-3 text-left">Course</th>
                  <th className="p-3 text-left">Joueur</th>
                  <th className="p-3 text-left">Sélection</th>
                  <th className="p-3 text-left">Points</th>
                  <th className="p-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((prediction: Prediction) => (
                  <tr
                    key={String(prediction.id ?? `${prediction.user_id}-${prediction.race_id}`)}
                    className="border-b border-gray-800/50 hover:bg-white/5"
                  >
                    <td className="p-3 font-body text-white">
                      {String(prediction.race_name ?? prediction.race_id ?? "—")}
                    </td>
                    <td className="p-3 font-body text-gray-400">
                      {String(prediction.user_email ?? prediction.user_id ?? "—")}
                    </td>
                    <td className="p-3 font-body text-gray-300">{predictionSummary(prediction)}</td>
                    <td className="p-3 font-data text-orange-400">
                      {String(prediction.points ?? prediction.score ?? "—")}
                    </td>
                    <td className="p-3 font-body text-xs text-gray-500">
                      {formatDate(prediction.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between border-t border-gray-800 p-3">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="text-gray-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-body text-xs text-gray-500">
                Page {page + 1} / {Math.ceil(total / limit)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage(page + 1)}
                className="text-gray-400"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
