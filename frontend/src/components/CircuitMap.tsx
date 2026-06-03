import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  selectedHotspotId?: string | null;
  onHotspotSelect?: (hotspotId: string) => void;
  renderMode?: "full" | "preview";
}

type CircuitFeatureItem =
  | (CircuitMapFeature & { source: "feature" })
  | (CircuitMapZone & { source: "zone" });

type HotspotFilter = "all" | "corners" | "drs" | "sectors";

const FEATURE_COLORS: Record<CircuitFeatureKind, string> = {
  start: "#E10600",
  corner: "#f59e0b",
  sector: "#3b82f6",
  drs: "#10b981",
};

const HOTSPOT_FILTERS: Array<{ value: HotspotFilter; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "corners", label: "Virages" },
  { value: "drs", label: "DRS" },
  { value: "sectors", label: "Secteurs" },
];

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

function matchesHotspotFilter(feature: CircuitFeatureItem, filter: HotspotFilter) {
  if (filter === "all") return true;
  if (filter === "corners") return feature.kind === "start" || feature.kind === "corner";
  if (filter === "drs") return feature.kind === "drs";
  return feature.kind === "sector";
}

function hotspotTypeLabel(feature: CircuitFeatureItem) {
  if (feature.kind === "start") return "Départ";
  if (feature.kind === "corner") return feature.turn ? `T${feature.turn}` : "Virage";
  if (feature.kind === "drs") return feature.source === "zone" ? "Zone DRS" : "DRS";
  return feature.source === "zone" ? "Zone" : "Secteur";
}

function zoneAnchorFromPath(path: string) {
  const values =
    path.match(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)?.map((value) => Number(value)) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    if (Number.isFinite(values[index]) && Number.isFinite(values[index + 1])) {
      points.push({ x: values[index], y: values[index + 1] });
    }
  }
  if (!points.length) return { x: 210, y: 140 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

export const CircuitMap = memo(function CircuitMap({
  circuitName,
  circuitFullName,
  country,
  fallbackImageUrl,
  mapData: mapDataProp,
  selectedHotspotId,
  onHotspotSelect,
  renderMode = "full",
}: CircuitMapProps) {
  const localMapData = useMemo(() => getCircuitMapData(circuitName), [circuitName]);
  const mapData = mapDataProp ?? localMapData;
  const imageUrl = mapData?.fallbackImageUrl ?? fallbackImageUrl ?? getCircuitImageUrl(circuitName);
  const isPreviewMode = renderMode === "preview";
  const featureItems = useMemo(() => getFeatureItems(mapData), [mapData]);
  const zoneAnchors = useMemo(() => {
    return new Map((mapData?.zones ?? []).map((zone) => [zone.id, zoneAnchorFromPath(zone.path)]));
  }, [mapData?.zones]);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(
    featureItems[0]?.id ?? null,
  );
  const [hotspotFilter, setHotspotFilter] = useState<HotspotFilter>("all");
  const [imageFailed, setImageFailed] = useState(false);

  const firstFeatureId = featureItems[0]?.id ?? null;
  const resolvedSelectedHotspotId =
    selectedHotspotId && featureItems.some((feature) => feature.id === selectedHotspotId)
      ? selectedHotspotId
      : firstFeatureId;

  useEffect(() => {
    setActiveFeatureId(resolvedSelectedHotspotId);
    setHotspotFilter("all");
    setImageFailed(false);
  }, [circuitName, imageUrl, mapData?.key]);

  useEffect(() => {
    if (selectedHotspotId !== undefined) {
      setActiveFeatureId(resolvedSelectedHotspotId);
    }
  }, [resolvedSelectedHotspotId, selectedHotspotId]);

  const activeFeature = useMemo(
    () => featureItems.find((feature) => feature.id === activeFeatureId),
    [activeFeatureId, featureItems],
  );
  const filteredFeatureItems = useMemo(
    () => featureItems.filter((feature) => matchesHotspotFilter(feature, hotspotFilter)),
    [featureItems, hotspotFilter],
  );
  const hotspotFilterCounts = useMemo(
    () =>
      HOTSPOT_FILTERS.reduce(
        (counts, filter) => ({
          ...counts,
          [filter.value]: featureItems.filter((feature) =>
            matchesHotspotFilter(feature, filter.value),
          ).length,
        }),
        {} as Record<HotspotFilter, number>,
      ),
    [featureItems],
  );
  const hasInteractiveMap = Boolean(mapData?.trackPath);
  const displayName = circuitFullName || mapData?.circuitName || circuitName;
  const firstCornerHotspotId = mapData?.firstCorner?.hotspotId ?? null;
  const activeIsFirstCorner =
    Boolean(firstCornerHotspotId) &&
    activeFeature?.source === "feature" &&
    activeFeature.id === firstCornerHotspotId;

  const previewFeature = useCallback(
    (featureId: string) => {
      if (isPreviewMode) return;
      setActiveFeatureId((current) => (current === featureId ? current : featureId));
    },
    [isPreviewMode],
  );

  const selectFeature = useCallback(
    (featureId: string) => {
      haptic("selection");
      setActiveFeatureId((current) => (current === featureId ? current : featureId));
      onHotspotSelect?.(featureId);
    },
    [onHotspotSelect],
  );

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
              {!isPreviewMode && (
                <defs>
                  <filter
                    id={`map-glow-${mapData.key}`}
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              )}

              <path
                d={mapData.trackPath}
                fill="none"
                stroke="#05060a"
                strokeWidth="22"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
              <path
                d={mapData.trackPath}
                fill="none"
                stroke="rgba(244,244,244,0.16)"
                strokeWidth="15"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
              <path
                d={mapData.trackPath}
                fill="none"
                stroke="rgba(244,244,244,0.82)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={isPreviewMode ? undefined : `url(#map-glow-${mapData.key})`}
                pointerEvents="none"
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
                  pointerEvents="none"
                />
              )}

              {mapData.zones.map((zone) => {
                const Icon = getFeatureIcon(zone.kind);
                const anchor = zoneAnchors.get(zone.id) ?? { x: 210, y: 140 };
                const isActive = activeFeatureId === zone.id;
                const color = FEATURE_COLORS[zone.kind];

                return (
                  <g
                    key={zone.id}
                    role="button"
                    tabIndex={0}
                    aria-label={circuitText(zone.label)}
                    aria-pressed={isActive}
                    className="cursor-pointer outline-none"
                    onClick={() => selectFeature(zone.id)}
                    onMouseEnter={isPreviewMode ? undefined : () => previewFeature(zone.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectFeature(zone.id);
                      }
                    }}
                  >
                    <path
                      d={zone.path}
                      fill="none"
                      stroke={color}
                      strokeWidth={isActive ? 16 : 11}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isActive ? 0.42 : 0.22}
                      className={cn(!isPreviewMode && "transition-all duration-200")}
                      pointerEvents="stroke"
                      data-testid={`circuit-zone-path-${zone.id}`}
                    />
                    <circle
                      cx={anchor.x}
                      cy={anchor.y}
                      r="18"
                      fill="transparent"
                      stroke="transparent"
                    />
                    <circle
                      cx={anchor.x}
                      cy={anchor.y}
                      r={isActive ? 11 : 8}
                      fill={isActive ? color : "#121418"}
                      stroke={color}
                      strokeWidth={isActive ? 4 : 3}
                      className={cn(!isPreviewMode && "transition-all duration-200")}
                      data-testid={`circuit-zone-${zone.id}`}
                    />
                    {!isPreviewMode && (
                      <foreignObject
                        x={anchor.x - 8}
                        y={anchor.y - 8}
                        width="16"
                        height="16"
                        className="pointer-events-none"
                      >
                        <Icon className="h-4 w-4 text-pk-piste" strokeWidth={1.8} />
                      </foreignObject>
                    )}
                  </g>
                );
              })}

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
                    onMouseEnter={isPreviewMode ? undefined : () => previewFeature(feature.id)}
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
                      className={cn(!isPreviewMode && "transition-all duration-200")}
                    />
                    {!isPreviewMode && (
                      <foreignObject
                        x={feature.x - 8}
                        y={feature.y - 8}
                        width="16"
                        height="16"
                        className="pointer-events-none"
                      >
                        <Icon className="h-4 w-4 text-pk-piste" strokeWidth={1.8} />
                      </foreignObject>
                    )}
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

        {hasInteractiveMap && featureItems.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2" data-testid="circuit-hotspot-summary">
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-2">
              <p className="font-data text-[0.8125rem] text-pk-piste">{featureItems.length}</p>
              <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                Hotspots
              </p>
            </div>
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-2">
              <p className="font-data text-[0.8125rem] text-pk-piste">
                {mapData?.features.length ?? 0}
              </p>
              <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                Points
              </p>
            </div>
            <div className="rounded-sm border border-white/[0.08] bg-white/[0.03] px-2 py-2">
              <p className="font-data text-[0.8125rem] text-pk-piste">
                {mapData?.zones.length ?? 0}
              </p>
              <p className="font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                Zones
              </p>
            </div>
          </div>
        )}

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
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-data text-[0.625rem] uppercase tracking-wider text-pk-piste">
                    {circuitText(activeFeature.label)}
                  </p>
                  {activeIsFirstCorner && (
                    <span
                      className="rounded-sm border border-pk-amber/30 bg-pk-amber/10 px-1.5 py-0.5 font-data text-[0.5rem] uppercase tracking-wider text-pk-amber"
                      data-testid="circuit-first-corner-badge"
                    >
                      Premier virage
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-pk-titane">
                  {circuitText(activeFeature.note)}
                </p>
              </div>
            </div>
          </div>
        )}

        {featureItems.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 grid grid-cols-4 gap-1" data-testid="circuit-hotspot-filters">
              {HOTSPOT_FILTERS.map((filter) => {
                const count = hotspotFilterCounts[filter.value];
                const active = hotspotFilter === filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setHotspotFilter(filter.value)}
                    className={cn(
                      "min-h-[34px] rounded-sm border px-1.5 py-1 font-data text-[0.5rem] uppercase tracking-wider transition-colors",
                      active
                        ? "border-pk-red/40 bg-pk-red-subtle text-pk-piste"
                        : "border-white/[0.08] bg-white/[0.03] text-pk-titane active:scale-[0.98]",
                    )}
                    data-testid={`circuit-hotspot-filter-${filter.value}`}
                  >
                    {filter.label}
                    <span className="ml-1 text-pk-titane">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {filteredFeatureItems.map((feature) => {
                const Icon = getFeatureIcon(feature.kind);
                const isActive = activeFeatureId === feature.id;
                const isFirstCorner =
                  Boolean(firstCornerHotspotId) &&
                  feature.source === "feature" &&
                  feature.id === firstCornerHotspotId;

                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => selectFeature(feature.id)}
                    className={cn(
                      "min-h-[52px] rounded-sm border px-2 py-2 text-left",
                      isPreviewMode ? "transition-colors" : "transition-all duration-200",
                      isActive
                        ? "border-pk-red/40 bg-pk-red-subtle text-pk-piste"
                        : "border-white/[0.08] bg-white/[0.03] text-pk-titane active:scale-[0.98]",
                    )}
                    data-testid={`circuit-feature-button-${feature.id}`}
                    aria-pressed={isActive}
                  >
                    <span className="flex items-start gap-1.5">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.7} />
                      <span className="min-w-0">
                        <span className="block truncate font-data text-[0.5625rem] uppercase tracking-wider">
                          {circuitText(feature.label)}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1 font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                          <span>{hotspotTypeLabel(feature)}</span>
                          {isFirstCorner && (
                            <span
                              className="text-pk-amber"
                              data-testid={`circuit-feature-first-corner-${feature.id}`}
                            >
                              Premier virage
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
