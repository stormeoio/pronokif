import { useEffect, useMemo, useState } from "react";
import { CornerDownRight, Flag, Gauge, Layers, MapPin, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import {
  circuitText,
  getCircuitImageUrl,
  getCircuitMapData,
  type CircuitFeatureKind,
  type CircuitMapData,
  type CircuitMapFeature,
  type CircuitMapZone,
} from "@/lib/circuitMaps";

interface CircuitMapProps {
  circuitName: string;
  circuitFullName?: string;
  country?: string;
  fallbackImageUrl?: string;
  mapData?: CircuitMapData | null;
}

type CircuitFeatureItem =
  | (CircuitMapFeature & { source: "feature" })
  | (CircuitMapZone & { source: "zone" });

const FEATURE_COLORS: Record<CircuitFeatureKind, string> = {
  start: "#E10600",
  corner: "#f59e0b",
  sector: "#3b82f6",
  drs: "#10b981",
};

function getFeatureIcon(kind: CircuitFeatureKind) {
  if (kind === "start") return Flag;
  if (kind === "corner") return CornerDownRight;
  if (kind === "drs") return Gauge;
  return Layers;
}

function getFeatureItems(mapData: CircuitMapData | null): CircuitFeatureItem[] {
  if (!mapData) return [];
  return [
    ...mapData.features.map((feature) => ({ ...feature, source: "feature" as const })),
    ...mapData.zones.map((zone) => ({ ...zone, source: "zone" as const })),
  ];
}

export function CircuitMap({
  circuitName,
  circuitFullName,
  country,
  fallbackImageUrl,
  mapData: mapDataProp,
}: CircuitMapProps) {
  const localMapData = useMemo(() => getCircuitMapData(circuitName), [circuitName]);
  const mapData = mapDataProp ?? localMapData;
  const imageUrl = mapData?.fallbackImageUrl ?? fallbackImageUrl ?? getCircuitImageUrl(circuitName);
  const featureItems = useMemo(() => getFeatureItems(mapData), [mapData]);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(
    featureItems[0]?.id ?? null,
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setActiveFeatureId(featureItems[0]?.id ?? null);
    setImageFailed(false);
  }, [circuitName, featureItems, imageUrl]);

  const activeFeature = featureItems.find((feature) => feature.id === activeFeatureId);
  const hasInteractiveMap = Boolean(mapData?.trackPath);
  const displayName = circuitFullName || mapData?.circuitName || circuitName;

  const selectFeature = (featureId: string) => {
    haptic("selection");
    setActiveFeatureId(featureId);
  };

  return (
    <section
      className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
      data-testid="circuit-map-card"
    >
      <div className="relative bg-pk-anthracite min-h-[18rem] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(225,6,0,0.18),transparent_34%),radial-gradient(circle_at_78%_64%,rgba(59,130,246,0.12),transparent_36%)]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:28px_28px]" />

        {hasInteractiveMap && mapData ? (
          <div
            className="relative z-10 h-full min-h-[18rem] p-4"
            data-testid="circuit-map-interactive"
          >
            <svg
              viewBox={mapData.viewBox}
              role="group"
              aria-label={`Carte interactive ${displayName}`}
              className="h-[17rem] w-full overflow-visible"
            >
              <defs>
                <filter id={`map-glow-${mapData.key}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {mapData.zones.map((zone) => {
                const isActive = activeFeatureId === zone.id;
                const color = FEATURE_COLORS[zone.kind];

                return (
                  <path
                    key={zone.id}
                    d={zone.path}
                    fill="none"
                    stroke={color}
                    strokeWidth={isActive ? 20 : 14}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isActive ? 0.42 : 0.22}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => selectFeature(zone.id)}
                    data-testid={`circuit-zone-${zone.id}`}
                  />
                );
              })}

              <path
                d={mapData.trackPath}
                fill="none"
                stroke="#05060a"
                strokeWidth="30"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={mapData.trackPath}
                fill="none"
                stroke="rgba(244,244,244,0.16)"
                strokeWidth="21"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={mapData.trackPath}
                fill="none"
                stroke="rgba(244,244,244,0.82)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#map-glow-${mapData.key})`}
              />
              {mapData.racingLinePath && (
                <path
                  d={mapData.racingLinePath}
                  fill="none"
                  stroke="#E10600"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="9 10"
                  opacity="0.82"
                />
              )}

              {mapData.features.map((feature) => {
                const Icon = getFeatureIcon(feature.kind);
                const isActive = activeFeatureId === feature.id;
                const color = FEATURE_COLORS[feature.kind];

                return (
                  <g
                    key={feature.id}
                    role="button"
                    tabIndex={0}
                    aria-label={circuitText(feature.label)}
                    aria-pressed={isActive}
                    className="cursor-pointer outline-none"
                    onClick={() => selectFeature(feature.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectFeature(feature.id);
                      }
                    }}
                    data-testid={`circuit-feature-${feature.id}`}
                  >
                    <circle
                      cx={feature.x}
                      cy={feature.y}
                      r="20"
                      fill="transparent"
                      stroke="transparent"
                    />
                    <circle
                      cx={feature.x}
                      cy={feature.y}
                      r={isActive ? 12 : 9}
                      fill={isActive ? color : "#121418"}
                      stroke={color}
                      strokeWidth={isActive ? 4 : 3}
                      className="transition-all duration-200"
                    />
                    <foreignObject
                      x={feature.x - 8}
                      y={feature.y - 8}
                      width="16"
                      height="16"
                      className="pointer-events-none"
                    >
                      <Icon className="h-4 w-4 text-pk-piste" strokeWidth={1.8} />
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="relative z-10 h-72 flex items-center justify-center">
            {imageUrl && !imageFailed ? (
              <img
                src={imageUrl}
                alt={`Circuit ${displayName}`}
                className="w-full h-full object-contain p-6 filter invert opacity-80"
                data-testid="circuit-image"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex flex-col items-center" data-testid="circuit-map-placeholder">
                <Route className="w-12 h-12 text-pk-titane/40 mb-2" />
                <p className="text-xs text-pk-titane">{displayName}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-[0.8125rem]" data-testid="circuit-name">
              {displayName}
            </p>
            {country && (
              <p className="text-[0.625rem] text-pk-titane flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {country}
              </p>
            )}
          </div>
          <span
            className={cn(
              "font-data text-[0.5rem] uppercase tracking-wider rounded-sm px-2 py-1 border flex-shrink-0",
              hasInteractiveMap
                ? "text-pk-emerald border-pk-emerald/25 bg-pk-emerald/[0.08]"
                : "text-pk-titane border-white/[0.08] bg-white/[0.04]",
            )}
          >
            {hasInteractiveMap ? "Interactive" : "Statique"}
          </span>
        </div>

        {activeFeature && (
          <div
            className="mt-3 rounded-md border border-white/[0.08] bg-white/[0.04] p-3"
            data-testid="circuit-active-feature"
          >
            <div className="flex items-start gap-2">
              <div
                className="mt-0.5 h-6 w-6 rounded-sm flex items-center justify-center border"
                style={{
                  borderColor: FEATURE_COLORS[activeFeature.kind],
                  background: `${FEATURE_COLORS[activeFeature.kind]}18`,
                }}
              >
                {(() => {
                  const Icon = getFeatureIcon(activeFeature.kind);
                  return <Icon className="h-3.5 w-3.5 text-pk-piste" strokeWidth={1.8} />;
                })()}
              </div>
              <div className="min-w-0">
                <p className="font-data text-[0.625rem] uppercase tracking-wider text-pk-piste">
                  {circuitText(activeFeature.label)}
                </p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-pk-titane">
                  {circuitText(activeFeature.note)}
                </p>
              </div>
            </div>
          </div>
        )}

        {featureItems.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {featureItems.slice(0, 6).map((feature) => {
              const Icon = getFeatureIcon(feature.kind);
              const isActive = activeFeatureId === feature.id;

              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => selectFeature(feature.id)}
                  className={cn(
                    "min-h-[44px] rounded-sm border px-2 py-2 text-left transition-all duration-200",
                    isActive
                      ? "border-pk-red/40 bg-pk-red-subtle text-pk-piste"
                      : "border-white/[0.08] bg-white/[0.03] text-pk-titane active:scale-[0.98]",
                  )}
                  data-testid={`circuit-feature-button-${feature.id}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.7} />
                    <span className="font-data text-[0.5625rem] uppercase tracking-wider truncate">
                      {circuitText(feature.label)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
