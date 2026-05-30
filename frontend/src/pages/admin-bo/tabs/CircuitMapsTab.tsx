import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Gauge,
  History,
  Layers,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import {
  CIRCUIT_MAP_PARAM,
  CIRCUIT_OWNER_PARAM,
  CIRCUIT_PRIORITY_PARAM,
  CIRCUIT_Q_PARAM,
  CIRCUIT_REVIEW_PARAM,
  CIRCUIT_SOURCE_PARAM,
  buildCircuitMapSearchParams,
  decodeOwnerFilter,
  decodePriorityFilter,
  decodeReviewFilter,
  decodeSourceFilter,
} from "./circuitMapUrlState";
import { CircuitMap } from "@/components/CircuitMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  CircuitFirstCorner,
  CircuitMapData,
  CircuitMapFeature,
  CircuitMapZone,
} from "@/lib/circuitMaps";

type CircuitMapRecord = {
  key: string;
  circuit_name: string;
  full_name: string;
  map_status: string;
  data_status?: string;
  review_status?: string;
  owner_admin_email?: string;
  admin_notes?: string;
  source?: "seed" | "admin";
  map_data: CircuitMapData;
  quality_report?: {
    is_interactive: boolean;
    has_fallback_image: boolean;
    has_first_corner?: boolean;
    first_corner_hotspot_id?: string;
    features_count: number;
    zones_count: number;
    missing_translations: number;
    path_errors?: number;
    warnings: string[];
    ready_for_public: boolean;
  };
  review_priority?: {
    level: "blocked" | "review" | "done";
    label: string;
    reason: string;
  };
  updated_at?: string;
  updated_by?: string;
};

type CircuitMapsResponse = {
  items: CircuitMapRecord[];
  total: number;
  summary?: {
    interactive: number;
    static: number;
    admin_overrides: number;
    approved: number;
    needs_review: number;
    ready_for_public?: number;
    first_corner_ready?: number;
    missing_first_corner?: number;
    blocked?: number;
    in_review?: number;
    owned_by_me?: number;
    unassigned?: number;
    coverage_percent?: number;
    total_features?: number;
    total_zones?: number;
  };
};

type CircuitMapDraft = {
  viewBox: string;
  trackPath: string;
  racingLinePath: string;
  fallbackImageUrl: string;
  aliases: string;
  firstCornerHotspotId: string;
  featuresJson: string;
  zonesJson: string;
  dataStatus: string;
  reviewStatus: string;
  ownerAdminEmail: string;
  adminNotes: string;
};

type CircuitMapsTabProps = {
  currentAdminEmail?: string;
};

type ActivityLog = {
  id: string;
  actor_email?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

const REVIEW_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "", label: "Non revus" },
  { value: "draft", label: "Brouillon" },
  { value: "in_review", label: "En revue" },
  { value: "needs_source", label: "Source à vérifier" },
  { value: "approved", label: "Validés" },
] as const;

const PRIORITY_FILTERS = [
  { value: "all", label: "Toutes priorités" },
  { value: "blocked", label: "Bloquées" },
  { value: "review", label: "À relire" },
  { value: "done", label: "Publiées" },
] as const;

const OWNER_FILTERS = [
  { value: "all", label: "Tous admins" },
  { value: "mine", label: "Mes cartes" },
  { value: "unassigned", label: "Sans propriétaire" },
  { value: "assigned", label: "Assignées" },
] as const;

const SOURCE_FILTERS = [
  { value: "all", label: "Toutes sources" },
  { value: "seed", label: "Seed" },
  { value: "admin", label: "Overrides admin" },
] as const;

const SVG_PATH_ARITY: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

const SVG_PATH_TOKEN_RE = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;

function formatJson(value: unknown) {
  return JSON.stringify(value ?? [], null, 2);
}

function initialDraft(item: CircuitMapRecord, currentAdminEmail = ""): CircuitMapDraft {
  return {
    viewBox: item.map_data?.viewBox || "0 0 420 280",
    trackPath: item.map_data?.trackPath || "",
    racingLinePath: item.map_data?.racingLinePath || "",
    fallbackImageUrl: item.map_data?.fallbackImageUrl || "",
    aliases: (item.map_data?.aliases || [item.circuit_name]).join("\n"),
    firstCornerHotspotId: item.map_data?.firstCorner?.hotspotId || "",
    featuresJson: formatJson(item.map_data?.features),
    zonesJson: formatJson(item.map_data?.zones),
    dataStatus: item.data_status || "seeded",
    reviewStatus: item.review_status || "",
    ownerAdminEmail: item.owner_admin_email || currentAdminEmail,
    adminNotes: item.admin_notes || "",
  };
}

function parseJsonArray<T>(value: string, label: string): T[] {
  const parsed = JSON.parse(value || "[]");
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} doit être un tableau JSON.`);
  }
  return parsed as T[];
}

function statusLabel(status?: string) {
  if (status === "approved") return "Validé";
  if (status === "in_review") return "En revue";
  if (status === "needs_source") return "Source à vérifier";
  if (status === "draft") return "Brouillon";
  return "Non revu";
}

function statusClass(status?: string) {
  if (status === "approved") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  if (status === "in_review") return "border-cyan-400/25 bg-cyan-500/10 text-cyan-300";
  if (status === "needs_source") return "border-amber-400/25 bg-amber-500/10 text-amber-300";
  return "border-white/10 bg-white/[0.04] text-pk-titane";
}

function priorityClass(level?: string) {
  if (level === "done") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  if (level === "blocked") return "border-red-400/25 bg-red-500/10 text-red-200";
  return "border-amber-400/25 bg-amber-500/10 text-amber-300";
}

function svgPathErrors(value: unknown, label: string) {
  const path = String(value || "").trim();
  if (!path) return [`${label} est requis`];

  const tokens = path.replaceAll(",", " ").match(SVG_PATH_TOKEN_RE) || [];
  if (tokens.length === 0) return [`${label} doit contenir un path SVG`];

  let index = 0;
  let currentCommand = "";
  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[a-zA-Z]$/.test(token)) {
      const command = token.toUpperCase();
      if (!(command in SVG_PATH_ARITY)) {
        return [`${label} contient une commande SVG invalide: ${token}`];
      }
      currentCommand = command;
      index += 1;
      if (command === "Z") continue;
    } else if (!currentCommand) {
      return [`${label} doit commencer par une commande SVG`];
    }

    const expected = SVG_PATH_ARITY[currentCommand];
    if (expected === 0) {
      return [`${label} contient des coordonnées après la commande ${currentCommand}`];
    }
    if (index + expected > tokens.length) {
      return [`${label} est incomplet pour la commande ${currentCommand}`];
    }
    const segment = tokens.slice(index, index + expected);
    if (segment.some((part) => /^[a-zA-Z]$/.test(part))) {
      return [`${label} est incomplet pour la commande ${currentCommand}`];
    }
    if (segment.some((part) => !Number.isFinite(Number(part)))) {
      return [`${label} contient une coordonnée invalide`];
    }
    index += expected;
  }

  return [];
}

function nextMapItemId<T extends { id: string }>(items: T[], prefix: string) {
  const used = new Set(items.map((item) => item.id));
  let index = items.length + 1;
  let candidate = `${prefix}-${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

function translationMissing(value: unknown) {
  if (!value || typeof value !== "object") return true;
  const localized = value as Partial<Record<"fr" | "en", string>>;
  return !localized.fr?.trim() || !localized.en?.trim();
}

const FIRST_CORNER_NOTE = {
  fr: "Repère canonique utilisé pour les statistiques pilotes au premier virage.",
  en: "Canonical reference used for driver first-corner statistics.",
};

function firstCornerFromFeature(feature?: CircuitMapFeature): CircuitFirstCorner | undefined {
  if (!feature) return undefined;
  return {
    hotspotId: feature.id,
    label: feature.label,
    note: FIRST_CORNER_NOTE,
  };
}

function inspectDraft(draft: CircuitMapDraft) {
  const errors: string[] = [];
  let features: CircuitMapFeature[] = [];
  let zones: CircuitMapZone[] = [];

  try {
    features = parseJsonArray<CircuitMapFeature>(draft.featuresJson, "features");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "features JSON invalide");
  }
  try {
    zones = parseJsonArray<CircuitMapZone>(draft.zonesJson, "zones");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "zones JSON invalide");
  }
  if (draft.trackPath.trim()) {
    errors.push(...svgPathErrors(draft.trackPath, "trackPath"));
  }
  if (draft.racingLinePath.trim()) {
    errors.push(...svgPathErrors(draft.racingLinePath, "racingLinePath"));
  }
  for (const [index, zone] of zones.entries()) {
    errors.push(...svgPathErrors(zone.path, `zones[${index}].path`));
  }

  const missingTranslations =
    features.filter(
      (feature) => translationMissing(feature.label) || translationMissing(feature.note),
    ).length +
    zones.filter((zone) => translationMissing(zone.label) || translationMissing(zone.note)).length;
  const firstCornerFeature = features.find((feature) => feature.id === draft.firstCornerHotspotId);
  const requiresFirstCorner = Boolean(draft.trackPath.trim() || features.length);
  if (
    firstCornerFeature &&
    (firstCornerFeature.kind !== "corner" || firstCornerFeature.turn !== 1)
  ) {
    errors.push("Le premier virage doit pointer vers un point de type virage avec turn=1.");
  }
  const warnings = [
    !draft.fallbackImageUrl.trim() ? "Image fallback manquante" : "",
    !draft.trackPath.trim() ? "Path SVG principal manquant" : "",
    features.length === 0 ? "Aucun point interactif" : "",
    zones.length === 0 ? "Aucune zone DRS/secteur" : "",
    requiresFirstCorner && !firstCornerFeature ? "Premier virage non identifié" : "",
    missingTranslations > 0 ? "Traductions fr/en incomplètes" : "",
    errors.some((error) => error.includes("path") || error.includes("Path"))
      ? "Path SVG invalide"
      : "",
  ].filter(Boolean);

  return {
    errors,
    warnings,
    features,
    zones,
    firstCornerFeature,
    missingTranslations,
    readyForPublic: errors.length === 0 && warnings.length === 0,
  };
}

function adminMutationErrorMessage(error: unknown) {
  const maybeResponse = error as { response?: { data?: { detail?: string } } };
  return maybeResponse.response?.data?.detail || "Impossible de sauvegarder la carte circuit";
}

function coordinateFromInput(value: string) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function formatActivityDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityMetadataSummary(metadata?: Record<string, unknown>) {
  if (!metadata) return "—";
  const entries = Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .slice(0, 3);
  if (!entries.length) return "—";
  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join(" · ");
}

export default function CircuitMapsTab({ currentAdminEmail = "" }: CircuitMapsTabProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get(CIRCUIT_Q_PARAM) || "");
  const [reviewStatus, setReviewStatus] = useState(() =>
    decodeReviewFilter(searchParams.get(CIRCUIT_REVIEW_PARAM)),
  );
  const [priority, setPriority] = useState(() =>
    decodePriorityFilter(searchParams.get(CIRCUIT_PRIORITY_PARAM)),
  );
  const [owner, setOwner] = useState(() =>
    decodeOwnerFilter(searchParams.get(CIRCUIT_OWNER_PARAM)),
  );
  const [source, setSource] = useState(() =>
    decodeSourceFilter(searchParams.get(CIRCUIT_SOURCE_PARAM)),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(() =>
    searchParams.get(CIRCUIT_MAP_PARAM),
  );
  const pendingSelectedKeyRef = useRef<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<CircuitMapDraft | null>(null);
  const [jsonError, setJsonError] = useState("");

  const applySelectedKey = useCallback((key: string | null) => {
    pendingSelectedKeyRef.current = key;
    setSelectedKey(key);
  }, []);

  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      review_status: reviewStatus === "all" ? undefined : reviewStatus,
      priority: priority === "all" ? undefined : priority,
      owner: owner === "all" ? undefined : owner,
      source: source === "all" ? undefined : source,
      limit: 80,
    }),
    [owner, priority, query, reviewStatus, source],
  );

  const { data, isLoading } = useQuery<CircuitMapsResponse>({
    queryKey: ["admin-bo", "circuit-maps", params],
    queryFn: () => adminApi.circuitMaps.list(params),
  });

  const items = useMemo(() => data?.items || [], [data?.items]);
  const selected = useMemo(
    () => items.find((item) => item.key === selectedKey) || items[0] || null,
    [items, selectedKey],
  );
  const selectedIndex = selected ? items.findIndex((item) => item.key === selected.key) : -1;
  const previousQueueKey = selectedIndex > 0 ? items[selectedIndex - 1]?.key : null;
  const nextQueueKey =
    selectedIndex >= 0 && selectedIndex < items.length - 1 ? items[selectedIndex + 1]?.key : null;

  const activityParams = useMemo(
    () => ({
      entity_type: "circuit_map",
      entity_id: selected?.key,
      limit: 6,
    }),
    [selected?.key],
  );

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ["admin-bo", "activity-logs", activityParams],
    queryFn: () => adminApi.activityLogs.list(activityParams),
    enabled: Boolean(selected?.key),
  });

  const recentActivity = (activityData?.logs ?? []) as ActivityLog[];

  useEffect(() => {
    if (!items.length) {
      applySelectedKey(null);
      return;
    }
    if (!selectedKey || !items.some((item) => item.key === selectedKey)) {
      applySelectedKey(items[0].key);
    }
  }, [applySelectedKey, items, selectedKey]);

  useEffect(() => {
    if (selected) {
      setDraft(initialDraft(selected, currentAdminEmail));
      setJsonError("");
    }
  }, [currentAdminEmail, selected]);

  const updateMutation = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string;
      payload: Record<string, unknown>;
      nextKey?: string | null;
    }) => adminApi.circuitMaps.update(key, payload),
    onSuccess: (response, variables) => {
      toast.success("Carte circuit mise à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "circuit-maps"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      applySelectedKey(variables.nextKey || response.item?.key || selectedKey);
    },
    onError: (error) => toast.error(adminMutationErrorMessage(error)),
  });

  const resetMutation = useMutation({
    mutationFn: (key: string) => adminApi.circuitMaps.reset(key),
    onSuccess: (response) => {
      toast.success("Carte circuit réinitialisée depuis le seed");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "circuit-maps"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "activity-logs"] });
      applySelectedKey(response.item?.key || selectedKey);
      if (response.item) {
        setDraft(initialDraft(response.item, currentAdminEmail));
      }
    },
    onError: (error) => toast.error(adminMutationErrorMessage(error)),
  });

  const buildPayload = (nextDraft: CircuitMapDraft) => {
    if (!selected) throw new Error("Aucune carte sélectionnée");
    const features = parseJsonArray<CircuitMapFeature>(nextDraft.featuresJson, "features");
    const zones = parseJsonArray<CircuitMapZone>(nextDraft.zonesJson, "zones");
    const aliases = nextDraft.aliases
      .split("\n")
      .map((alias) => alias.trim())
      .filter(Boolean);
    const firstCornerFeature = features.find(
      (feature) => feature.id === nextDraft.firstCornerHotspotId,
    );

    const mapData: CircuitMapData = {
      ...selected.map_data,
      key: selected.key,
      circuitName: selected.map_data?.circuitName || selected.circuit_name,
      aliases,
      fallbackImageUrl: nextDraft.fallbackImageUrl.trim(),
      viewBox: nextDraft.viewBox.trim() || "0 0 420 280",
      trackPath: nextDraft.trackPath.trim() || undefined,
      racingLinePath: nextDraft.racingLinePath.trim() || undefined,
      features,
      zones,
      firstCorner: firstCornerFromFeature(firstCornerFeature),
    };

    return {
      map_data: mapData,
      data_status: nextDraft.dataStatus.trim() || undefined,
      review_status: nextDraft.reviewStatus,
      owner_admin_email: nextDraft.ownerAdminEmail.trim() || undefined,
      admin_notes: nextDraft.adminNotes,
    };
  };

  const saveDraft = (nextDraft = draft, options?: { nextKey?: string | null }) => {
    if (!selected || !nextDraft) return;
    try {
      setJsonError("");
      updateMutation.mutate({
        key: selected.key,
        payload: buildPayload(nextDraft),
        nextKey: options?.nextKey,
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "JSON invalide");
    }
  };

  const patchAndSave = (patch: Partial<CircuitMapDraft>, options?: { nextKey?: string | null }) => {
    if (!draft) return;
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    saveDraft(nextDraft, options);
  };

  const addFeatureTemplate = () => {
    if (!draft) return;
    try {
      const features = parseJsonArray<CircuitMapFeature>(draft.featuresJson, "features");
      const nextFeature: CircuitMapFeature = {
        id: nextMapItemId(features, "point"),
        kind: "corner",
        x: 210,
        y: 140,
        label: { fr: "Nouveau point", en: "New point" },
        note: {
          fr: "Décrire l'impact pronostic ou lecture course.",
          en: "Describe the prediction or race-read impact.",
        },
      };
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        featuresJson: formatJson([...features, nextFeature]),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "features JSON invalide");
    }
  };

  const addZoneTemplate = () => {
    if (!draft) return;
    try {
      const zones = parseJsonArray<CircuitMapZone>(draft.zonesJson, "zones");
      const nextZone: CircuitMapZone = {
        id: nextMapItemId(zones, "zone"),
        kind: "sector",
        path: "M110 145 C165 120 245 120 310 145",
        label: { fr: "Nouvelle zone", en: "New zone" },
        note: {
          fr: "Qualifier la zone : DRS, secteur fort, piège météo ou dépassement.",
          en: "Qualify the zone: DRS, strong sector, weather trap, or overtaking.",
        },
      };
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        zonesJson: formatJson([...zones, nextZone]),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "zones JSON invalide");
    }
  };

  const updateFeatureAt = (index: number, patch: Partial<CircuitMapFeature>) => {
    if (!draft) return;
    try {
      const features = parseJsonArray<CircuitMapFeature>(draft.featuresJson, "features");
      const current = features[index];
      if (!current) return;
      features[index] = { ...current, ...patch };
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        featuresJson: formatJson(features),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "features JSON invalide");
    }
  };

  const updateFeatureText = (
    index: number,
    field: "label" | "note",
    locale: "fr" | "en",
    value: string,
  ) => {
    if (!draft) return;
    try {
      const features = parseJsonArray<CircuitMapFeature>(draft.featuresJson, "features");
      const current = features[index];
      if (!current) return;
      features[index] = {
        ...current,
        [field]: { ...current[field], [locale]: value },
      };
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        featuresJson: formatJson(features),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "features JSON invalide");
    }
  };

  const removeFeatureAt = (index: number) => {
    if (!draft) return;
    try {
      const features = parseJsonArray<CircuitMapFeature>(draft.featuresJson, "features");
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        featuresJson: formatJson(features.filter((_, featureIndex) => featureIndex !== index)),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "features JSON invalide");
    }
  };

  const updateZoneAt = (index: number, patch: Partial<CircuitMapZone>) => {
    if (!draft) return;
    try {
      const zones = parseJsonArray<CircuitMapZone>(draft.zonesJson, "zones");
      const current = zones[index];
      if (!current) return;
      zones[index] = { ...current, ...patch };
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        zonesJson: formatJson(zones),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "zones JSON invalide");
    }
  };

  const updateZoneText = (
    index: number,
    field: "label" | "note",
    locale: "fr" | "en",
    value: string,
  ) => {
    if (!draft) return;
    try {
      const zones = parseJsonArray<CircuitMapZone>(draft.zonesJson, "zones");
      const current = zones[index];
      if (!current) return;
      zones[index] = {
        ...current,
        [field]: { ...current[field], [locale]: value },
      };
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        zonesJson: formatJson(zones),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "zones JSON invalide");
    }
  };

  const removeZoneAt = (index: number) => {
    if (!draft) return;
    try {
      const zones = parseJsonArray<CircuitMapZone>(draft.zonesJson, "zones");
      setJsonError("");
      setDraft({
        ...draft,
        reviewStatus: draft.reviewStatus || "draft",
        zonesJson: formatJson(zones.filter((_, zoneIndex) => zoneIndex !== index)),
      });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "zones JSON invalide");
    }
  };

  const summary = data?.summary;
  const draftInspection = useMemo(() => (draft ? inspectDraft(draft) : null), [draft]);
  const baselineDraft = useMemo(
    () => (selected ? initialDraft(selected, currentAdminEmail) : null),
    [currentAdminEmail, selected],
  );
  const isDirty = Boolean(
    draft && baselineDraft && JSON.stringify(draft) !== JSON.stringify(baselineDraft),
  );

  useEffect(() => {
    const nextQuery = searchParams.get(CIRCUIT_Q_PARAM) || "";
    const nextReview = decodeReviewFilter(searchParams.get(CIRCUIT_REVIEW_PARAM));
    const nextPriority = decodePriorityFilter(searchParams.get(CIRCUIT_PRIORITY_PARAM));
    const nextOwner = decodeOwnerFilter(searchParams.get(CIRCUIT_OWNER_PARAM));
    const nextSource = decodeSourceFilter(searchParams.get(CIRCUIT_SOURCE_PARAM));
    const nextSelectedKey = searchParams.get(CIRCUIT_MAP_PARAM);
    const pendingSelectedKey = pendingSelectedKeyRef.current;

    if (pendingSelectedKey !== undefined) {
      if (
        nextSelectedKey === pendingSelectedKey ||
        (pendingSelectedKey === null && !nextSelectedKey)
      ) {
        pendingSelectedKeyRef.current = undefined;
      } else if (selectedKey === pendingSelectedKey) {
        return;
      }
    }

    if (nextQuery !== query) setQuery(nextQuery);
    if (nextReview !== reviewStatus) setReviewStatus(nextReview);
    if (nextPriority !== priority) setPriority(nextPriority);
    if (nextOwner !== owner) setOwner(nextOwner);
    if (nextSource !== source) setSource(nextSource);
    if (nextSelectedKey && nextSelectedKey !== selectedKey && !isDirty) {
      pendingSelectedKeyRef.current = undefined;
      setSelectedKey(nextSelectedKey);
    }
  }, [isDirty, owner, priority, query, reviewStatus, searchParams, selectedKey, source]);

  useEffect(() => {
    const next = buildCircuitMapSearchParams(searchParams, {
      query,
      reviewStatus,
      priority,
      owner,
      source,
      selectedKey,
    });

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [owner, priority, query, reviewStatus, searchParams, selectedKey, setSearchParams, source]);

  const selectedPriority = selected?.review_priority;
  const previewMapData = useMemo<CircuitMapData | null>(() => {
    if (!selected) return null;
    if (!draft) return selected.map_data;
    const aliases = draft.aliases
      .split("\n")
      .map((alias) => alias.trim())
      .filter(Boolean);
    return {
      ...selected.map_data,
      key: selected.key,
      circuitName: selected.map_data?.circuitName || selected.circuit_name,
      aliases,
      fallbackImageUrl: draft.fallbackImageUrl.trim(),
      viewBox: draft.viewBox.trim() || "0 0 420 280",
      trackPath: draft.trackPath.trim() || undefined,
      racingLinePath: draft.racingLinePath.trim() || undefined,
      features: draftInspection?.features ?? selected.map_data.features,
      zones: draftInspection?.zones ?? selected.map_data.zones,
      firstCorner: firstCornerFromFeature(draftInspection?.firstCornerFeature),
    };
  }, [draft, draftInspection, selected]);

  const selectMap = (key: string) => {
    if (key === selectedKey) return;
    if (
      isDirty &&
      !window.confirm("Des modifications locales ne sont pas sauvegardées. Changer de carte ?")
    ) {
      return;
    }
    applySelectedKey(key);
  };

  const selectAdjacentMap = (key: string | null) => {
    if (key) selectMap(key);
  };

  const resetLocalDraft = () => {
    if (!baselineDraft) return;
    setDraft(baselineDraft);
    setJsonError("");
  };

  const resetToSeed = () => {
    if (!selected) return;
    const confirmed = window.confirm(
      "Réinitialiser cette carte avec les données seed et supprimer l'override admin ?",
    );
    if (confirmed) {
      resetMutation.mutate(selected.key);
    }
  };

  const copyReviewLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien de revue copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">
            Cartes circuits
          </h2>
          <p className="mt-1 text-xs text-pk-titane">
            Tracés interactifs, zones DRS, virages clés et notes réutilisées par l'app et le RAG.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["admin-bo", "circuit-maps"] })
            }
            variant="ghost"
            className="text-cyan-300 hover:text-cyan-200"
            size="sm"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Rafraîchir
          </Button>
          <Button
            onClick={copyReviewLink}
            variant="ghost"
            className="text-pk-titane hover:text-white"
            size="sm"
            data-testid="copy-circuit-map-review-link"
          >
            <Copy className="mr-1 h-4 w-4" />
            Copier lien
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <div className="card-arcade p-4">
          <Route className="mb-2 h-4 w-4 text-pk-red" />
          <p className="font-data text-2xl text-white">{data?.total ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Circuits</p>
        </div>
        <div className="card-arcade p-4">
          <MapPinned className="mb-2 h-4 w-4 text-cyan-400" />
          <p className="font-data text-2xl text-white">{summary?.coverage_percent ?? 0}%</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Couverture</p>
        </div>
        <div className="card-arcade p-4">
          <Layers className="mb-2 h-4 w-4 text-amber-400" />
          <p className="font-data text-2xl text-white">{summary?.ready_for_public ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Prêtes</p>
        </div>
        <div className="card-arcade p-4">
          <UserCheck className="mb-2 h-4 w-4 text-purple-300" />
          <p className="font-data text-2xl text-white">{summary?.in_review ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">À relire</p>
        </div>
        <div className="card-arcade p-4">
          <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-300" />
          <p className="font-data text-2xl text-white">{summary?.approved ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Validés</p>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="font-data text-[10px] uppercase text-pk-titane">Pipeline éditorial</p>
            <div className="mt-2 h-2 overflow-hidden rounded-sm bg-white/[0.06]">
              <div
                className="h-full rounded-sm bg-pk-red"
                style={{ width: `${Math.min(summary?.coverage_percent ?? 0, 100)}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:min-w-[420px]">
            <div className="border-l border-white/10 pl-3">
              <p className="font-data text-lg text-white">{summary?.interactive ?? 0}</p>
              <p className="font-data text-[9px] uppercase text-pk-titane">Interactifs</p>
            </div>
            <div className="border-l border-white/10 pl-3">
              <p className="font-data text-lg text-white">{summary?.blocked ?? 0}</p>
              <p className="font-data text-[9px] uppercase text-pk-titane">Bloqués</p>
            </div>
            <div className="border-l border-white/10 pl-3">
              <p className="font-data text-lg text-white">
                {(summary?.total_features ?? 0) + (summary?.total_zones ?? 0)}
              </p>
              <p className="font-data text-[9px] uppercase text-pk-titane">Objets RAG</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_190px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher Monaco, DRS, validation..."
              className="bg-gray-900 border-gray-700 pl-9 text-white"
            />
          </div>
          <select
            value={reviewStatus}
            onChange={(event) => setReviewStatus(event.target.value)}
            className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
          >
            {REVIEW_FILTERS.map((status) => (
              <option key={status.value || "empty"} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            data-testid="circuit-map-priority-filter"
          >
            {PRIORITY_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            data-testid="circuit-map-owner-filter"
          >
            {OWNER_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
            data-testid="circuit-map-source-filter"
          >
            {SOURCE_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOwner(owner === "mine" ? "all" : "mine")}
            className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase transition-colors ${
              owner === "mine"
                ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-300"
                : "border-white/10 bg-white/[0.03] text-pk-titane hover:text-white"
            }`}
            data-testid="circuit-map-owner-chip-mine"
          >
            Mes cartes · {summary?.owned_by_me ?? 0}
          </button>
          <button
            type="button"
            onClick={() => setOwner(owner === "unassigned" ? "all" : "unassigned")}
            className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase transition-colors ${
              owner === "unassigned"
                ? "border-amber-400/25 bg-amber-500/10 text-amber-300"
                : "border-white/10 bg-white/[0.03] text-pk-titane hover:text-white"
            }`}
            data-testid="circuit-map-owner-chip-unassigned"
          >
            Sans propriétaire · {summary?.unassigned ?? 0}
          </button>
          <button
            type="button"
            onClick={() => setSource(source === "admin" ? "all" : "admin")}
            className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase transition-colors ${
              source === "admin"
                ? "border-pk-red/35 bg-pk-red-subtle text-red-200"
                : "border-white/10 bg-white/[0.03] text-pk-titane hover:text-white"
            }`}
            data-testid="circuit-map-source-chip-admin"
          >
            Overrides · {summary?.admin_overrides ?? 0}
          </button>
          {PRIORITY_FILTERS.slice(1).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPriority(priority === item.value ? "all" : item.value)}
              className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase transition-colors ${
                priority === item.value
                  ? priorityClass(item.value === "done" ? "done" : item.value)
                  : "border-white/10 bg-white/[0.03] text-pk-titane hover:text-white"
              }`}
              data-testid={`circuit-map-priority-chip-${item.value}`}
            >
              {item.label}
            </button>
          ))}
          {query ||
          reviewStatus !== "all" ||
          priority !== "all" ||
          owner !== "all" ||
          source !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setReviewStatus("all");
                setPriority("all");
                setOwner("all");
                setSource("all");
              }}
              className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 font-data text-[9px] uppercase text-pk-titane transition-colors hover:text-white"
              data-testid="clear-circuit-map-filters"
            >
              Effacer filtres
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="card-arcade p-3">
          <div className="mb-3 flex items-center gap-2 px-1">
            <Route className="h-4 w-4 text-pk-red" />
            <h3 className="font-heading text-sm uppercase text-white">Inventaire</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-pk-red" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center font-body text-sm text-gray-500">Aucune carte</p>
          ) : (
            <div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => {
                const active = item.key === selected?.key;
                const featureCount = item.map_data?.features?.length || 0;
                const zoneCount = item.map_data?.zones?.length || 0;
                return (
                  <button
                    key={item.key}
                    onClick={() => selectMap(item.key)}
                    data-testid={`select-circuit-map-${item.key}`}
                    className={`w-full rounded-md border p-3 text-left transition-colors duration-75 ${
                      active
                        ? "border-pk-red/45 bg-pk-red-subtle"
                        : "border-white/10 bg-black/25 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-body text-sm font-semibold text-white">
                          {item.full_name || item.circuit_name}
                        </p>
                        <p className="font-data text-[10px] uppercase text-pk-titane">{item.key}</p>
                      </div>
                      <span
                        className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase ${statusClass(
                          item.review_status,
                        )}`}
                      >
                        {statusLabel(item.review_status)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase ${priorityClass(
                          item.review_priority?.level,
                        )}`}
                      >
                        {item.review_priority?.label || "À qualifier"}
                      </span>
                      {item.quality_report?.ready_for_public ? (
                        <span className="font-data text-[9px] uppercase text-emerald-300">
                          Publiable
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-pk-titane">
                      <span className="rounded bg-white/[0.04] px-2 py-1">
                        {item.source === "admin" ? "Override admin" : "Seed"}
                      </span>
                      <span className="rounded bg-white/[0.04] px-2 py-1">
                        {featureCount} point(s)
                      </span>
                      <span className="rounded bg-white/[0.04] px-2 py-1">{zoneCount} zone(s)</span>
                      {item.quality_report?.has_first_corner ? (
                        <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-300">
                          T1 {item.quality_report.first_corner_hotspot_id}
                        </span>
                      ) : (
                        <span className="rounded bg-red-500/10 px-2 py-1 text-red-200">
                          T1 manquant
                        </span>
                      )}
                      {item.quality_report?.warnings?.length ? (
                        <span className="rounded bg-amber-500/10 px-2 py-1 text-amber-300">
                          {item.quality_report.warnings.length} alerte(s)
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {selected && draft ? (
            <>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-hidden">
                  <CircuitMap
                    circuitName={selected.circuit_name}
                    circuitFullName={selected.full_name}
                    mapData={previewMapData ?? selected.map_data}
                    renderMode="preview"
                  />
                </div>
                <div className="card-arcade p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg uppercase text-white">
                        {selected.full_name}
                      </p>
                      <p className="font-data text-[10px] uppercase text-pk-titane">
                        {selected.map_status} • {selected.source}
                      </p>
                      {selectedPriority?.reason ? (
                        <p className="mt-1 text-xs text-pk-titane">{selectedPriority.reason}</p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-sm border px-2 py-1 font-data text-[10px] uppercase ${priorityClass(selectedPriority?.level)}`}
                    >
                      {selectedPriority?.label || statusLabel(draft.reviewStatus)}
                    </span>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 font-data text-[9px] uppercase text-pk-titane">
                      {selected.source === "admin" ? "Override admin" : "Seed actif"}
                    </span>
                    <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 font-data text-[9px] uppercase text-pk-titane">
                      {selectedIndex + 1}/{items.length} dans la file
                    </span>
                    {isDirty ? (
                      <span className="rounded-sm border border-amber-400/25 bg-amber-500/10 px-2 py-1 font-data text-[9px] uppercase text-amber-300">
                        Modifié non sauvegardé
                      </span>
                    ) : null}
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => selectAdjacentMap(previousQueueKey)}
                      disabled={
                        !previousQueueKey || updateMutation.isPending || resetMutation.isPending
                      }
                      variant="ghost"
                      className="text-pk-titane hover:text-white"
                      size="sm"
                      data-testid="previous-circuit-map"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      onClick={() => selectAdjacentMap(nextQueueKey)}
                      disabled={
                        !nextQueueKey || updateMutation.isPending || resetMutation.isPending
                      }
                      variant="ghost"
                      className="text-pk-titane hover:text-white"
                      size="sm"
                      data-testid="next-circuit-map"
                    >
                      Suivant
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    <select
                      value={draft.reviewStatus}
                      onChange={(event) => setDraft({ ...draft, reviewStatus: event.target.value })}
                      className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
                    >
                      {REVIEW_FILTERS.filter((status) => status.value !== "all").map((status) => (
                        <option key={status.value || "empty"} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={draft.ownerAdminEmail}
                      onChange={(event) =>
                        setDraft({ ...draft, ownerAdminEmail: event.target.value })
                      }
                      placeholder="Admin propriétaire"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <Textarea
                      value={draft.adminNotes}
                      onChange={(event) => setDraft({ ...draft, adminNotes: event.target.value })}
                      placeholder="Notes admin : sources, état du tracé, zones à vérifier..."
                      rows={5}
                      className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      onClick={() =>
                        patchAndSave({
                          ownerAdminEmail: currentAdminEmail,
                          reviewStatus: "in_review",
                        })
                      }
                      disabled={updateMutation.isPending || resetMutation.isPending}
                      variant="ghost"
                      className="text-cyan-300 hover:text-cyan-200"
                      size="sm"
                    >
                      <UserCheck className="mr-1 h-4 w-4" />
                      Prendre
                    </Button>
                    <Button
                      onClick={() =>
                        patchAndSave(
                          {
                            ownerAdminEmail: currentAdminEmail,
                            reviewStatus: "in_review",
                          },
                          { nextKey: nextQueueKey },
                        )
                      }
                      disabled={
                        !nextQueueKey || updateMutation.isPending || resetMutation.isPending
                      }
                      variant="ghost"
                      className="text-cyan-300 hover:text-cyan-200"
                      size="sm"
                      data-testid="claim-and-next-circuit-map"
                    >
                      <UserCheck className="mr-1 h-4 w-4" />
                      Prendre + suiv.
                    </Button>
                    <Button
                      onClick={() => patchAndSave({ reviewStatus: "approved" })}
                      disabled={
                        updateMutation.isPending ||
                        resetMutation.isPending ||
                        !draftInspection?.readyForPublic
                      }
                      variant="ghost"
                      className="text-emerald-300 hover:text-emerald-200"
                      size="sm"
                      data-testid="approve-circuit-map"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Valider
                    </Button>
                    <Button
                      onClick={() =>
                        patchAndSave({ reviewStatus: "approved" }, { nextKey: nextQueueKey })
                      }
                      disabled={
                        !nextQueueKey ||
                        updateMutation.isPending ||
                        resetMutation.isPending ||
                        !draftInspection?.readyForPublic
                      }
                      variant="ghost"
                      className="text-emerald-300 hover:text-emerald-200"
                      size="sm"
                      data-testid="approve-and-next-circuit-map"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Valider + suiv.
                    </Button>
                    <Button
                      onClick={resetLocalDraft}
                      disabled={!isDirty || updateMutation.isPending || resetMutation.isPending}
                      variant="ghost"
                      className="text-pk-titane hover:text-white"
                      size="sm"
                      data-testid="reset-circuit-map-local-draft"
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Annuler
                    </Button>
                    <Button
                      onClick={resetToSeed}
                      disabled={
                        selected.source !== "admin" ||
                        updateMutation.isPending ||
                        resetMutation.isPending
                      }
                      variant="ghost"
                      className="text-red-200 hover:text-red-100"
                      size="sm"
                      data-testid="reset-circuit-map-seed"
                    >
                      {resetMutation.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 h-4 w-4" />
                      )}
                      Seed
                    </Button>
                  </div>

                  <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-300" />
                        <p className="font-data text-[10px] uppercase text-pk-titane">
                          Contrôle qualité
                        </p>
                      </div>
                      <span
                        className={`rounded-sm border px-2 py-1 font-data text-[9px] uppercase ${
                          draftInspection?.readyForPublic
                            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-400/25 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {draftInspection?.readyForPublic ? "Prêt" : "À revoir"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="font-data text-lg text-white">
                          {draftInspection?.features.length ?? 0}
                        </p>
                        <p className="font-data text-[9px] uppercase text-pk-titane">Points</p>
                      </div>
                      <div>
                        <p className="font-data text-lg text-white">
                          {draftInspection?.zones.length ?? 0}
                        </p>
                        <p className="font-data text-[9px] uppercase text-pk-titane">Zones</p>
                      </div>
                      <div>
                        <p className="font-data text-lg text-white">
                          {draftInspection?.missingTranslations ?? 0}
                        </p>
                        <p className="font-data text-[9px] uppercase text-pk-titane">i18n</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {draftInspection?.errors.map((error) => (
                        <p key={error} className="text-xs text-red-200">
                          {error}
                        </p>
                      ))}
                      {!draftInspection?.errors.length &&
                        draftInspection?.warnings.slice(0, 4).map((warning) => (
                          <p key={warning} className="text-xs text-amber-200">
                            {warning}
                          </p>
                        ))}
                      {draftInspection?.readyForPublic ? (
                        <p className="text-xs text-emerald-200">Carte prête pour publication.</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-cyan-300" />
                        <p className="font-data text-[10px] uppercase text-pk-titane">Historique</p>
                      </div>
                      <span className="font-data text-[9px] uppercase text-pk-titane">
                        {activityData?.total ?? 0} trace(s)
                      </span>
                    </div>
                    {isActivityLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-pk-red" />
                      </div>
                    ) : recentActivity.length ? (
                      <div className="space-y-2" data-testid="circuit-map-activity-log">
                        {recentActivity.map((log) => (
                          <div
                            key={log.id}
                            className="rounded-sm border border-white/10 bg-white/[0.03] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate font-data text-[10px] uppercase text-white">
                                {log.action ?? "action"}
                              </p>
                              <span className="whitespace-nowrap font-data text-[9px] uppercase text-pk-titane">
                                {formatActivityDate(log.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-xs text-pk-titane">
                              {log.actor_email || "admin"} · {activityMetadataSummary(log.metadata)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-3 text-center text-xs text-pk-titane">
                        Aucune trace sur cette carte.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="card-arcade p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-sm uppercase text-white">Données de tracé</h3>
                    <p className="mt-1 text-xs text-pk-titane">
                      Les libellés et notes sont locale-keyed pour préparer l'internationalisation.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isDirty ? (
                      <span className="rounded-sm border border-amber-400/25 bg-amber-500/10 px-2 py-1 font-data text-[9px] uppercase text-amber-300">
                        Brouillon local
                      </span>
                    ) : null}
                    <Button
                      onClick={() => saveDraft()}
                      disabled={updateMutation.isPending || resetMutation.isPending}
                      variant="ghost"
                      className="text-pk-red hover:text-red-300"
                      size="sm"
                      data-testid="save-circuit-map"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-1 h-4 w-4" />
                      )}
                      Sauvegarder
                    </Button>
                  </div>
                </div>

                {jsonError && (
                  <div className="mb-4 flex items-start gap-2 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {jsonError}
                  </div>
                )}

                <div className="mb-4 flex flex-wrap gap-2">
                  <Button
                    onClick={addFeatureTemplate}
                    variant="ghost"
                    className="text-amber-300 hover:text-amber-200"
                    size="sm"
                    data-testid="add-circuit-map-feature"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter point
                  </Button>
                  <Button
                    onClick={addZoneTemplate}
                    variant="ghost"
                    className="text-cyan-300 hover:text-cyan-200"
                    size="sm"
                    data-testid="add-circuit-map-zone"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter zone
                  </Button>
                  <Button
                    onClick={() => setDraft({ ...draft, reviewStatus: "needs_source" })}
                    variant="ghost"
                    className="text-pk-titane hover:text-white"
                    size="sm"
                    data-testid="mark-circuit-map-needs-source"
                  >
                    <AlertTriangle className="mr-1 h-4 w-4" />
                    Source à vérifier
                  </Button>
                  <Button
                    onClick={() =>
                      patchAndSave({ reviewStatus: "needs_source" }, { nextKey: nextQueueKey })
                    }
                    disabled={!nextQueueKey || updateMutation.isPending || resetMutation.isPending}
                    variant="ghost"
                    className="text-amber-300 hover:text-amber-200"
                    size="sm"
                    data-testid="mark-circuit-map-needs-source-and-next"
                  >
                    <AlertTriangle className="mr-1 h-4 w-4" />À sourcer + suiv.
                  </Button>
                </div>

                <div className="mb-4 rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-amber-300" />
                      <p className="font-data text-[10px] uppercase text-pk-titane">
                        Premier virage stats pilotes
                      </p>
                    </div>
                    {draft.firstCornerHotspotId ? (
                      <span className="rounded-sm border border-amber-400/25 bg-amber-500/10 px-2 py-1 font-data text-[9px] uppercase text-amber-300">
                        {draft.firstCornerHotspotId}
                      </span>
                    ) : null}
                  </div>
                  <select
                    value={draft.firstCornerHotspotId}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        firstCornerHotspotId: event.target.value,
                        reviewStatus: draft.reviewStatus || "draft",
                      })
                    }
                    className="h-10 w-full rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
                    data-testid="circuit-map-first-corner-select"
                  >
                    <option value="">Non identifié</option>
                    {(draftInspection?.features ?? [])
                      .filter((feature) => feature.kind === "corner")
                      .map((feature) => (
                        <option key={feature.id} value={feature.id}>
                          {feature.turn ? `T${feature.turn} · ` : ""}
                          {feature.label?.fr || feature.id}
                        </option>
                      ))}
                  </select>
                  <p className="mt-2 text-xs leading-relaxed text-pk-titane">
                    Ce hotspot devient la référence stable pour les statistiques pilotes liées au
                    premier virage.
                  </p>
                </div>

                <div className="mb-4 grid gap-4 xl:grid-cols-2">
                  <div className="rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-amber-300" />
                        <p className="font-data text-[10px] uppercase text-pk-titane">
                          Atelier points
                        </p>
                      </div>
                      <span className="font-data text-[9px] uppercase text-pk-titane">
                        {draftInspection?.features.length ?? 0} élément(s)
                      </span>
                    </div>
                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {draftInspection?.features.map((feature, index) => (
                        <div
                          key={`${feature.id}-${index}`}
                          className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_118px_44px]">
                            <Input
                              value={feature.id}
                              onChange={(event) =>
                                updateFeatureAt(index, { id: event.target.value })
                              }
                              aria-label="Identifiant du point"
                              className="bg-gray-900 border-gray-700 text-white"
                              data-testid={`circuit-map-feature-id-${index}`}
                            />
                            <select
                              value={feature.kind}
                              onChange={(event) =>
                                updateFeatureAt(index, {
                                  kind: event.target.value as CircuitMapFeature["kind"],
                                })
                              }
                              aria-label="Type du point"
                              className="h-10 rounded-md border border-gray-700 bg-gray-900 px-2 font-body text-sm text-white"
                            >
                              <option value="start">Départ</option>
                              <option value="corner">Virage</option>
                              <option value="sector">Secteur</option>
                              <option value="drs">DRS</option>
                            </select>
                            <Button
                              type="button"
                              onClick={() => removeFeatureAt(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-200 hover:text-red-100"
                              aria-label="Supprimer le point"
                              data-testid={`remove-circuit-map-feature-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-2 md:grid-cols-3">
                            <Input
                              type="number"
                              value={feature.x}
                              onChange={(event) =>
                                updateFeatureAt(index, {
                                  x: coordinateFromInput(event.target.value),
                                })
                              }
                              aria-label="Coordonnée X"
                              className="bg-gray-900 border-gray-700 text-white"
                            />
                            <Input
                              type="number"
                              value={feature.y}
                              onChange={(event) =>
                                updateFeatureAt(index, {
                                  y: coordinateFromInput(event.target.value),
                                })
                              }
                              aria-label="Coordonnée Y"
                              className="bg-gray-900 border-gray-700 text-white"
                            />
                            <Input
                              type="number"
                              value={feature.turn ?? ""}
                              onChange={(event) =>
                                updateFeatureAt(index, {
                                  turn: event.target.value
                                    ? coordinateFromInput(event.target.value)
                                    : undefined,
                                })
                              }
                              placeholder="Virage"
                              aria-label="Numéro de virage"
                              className="bg-gray-900 border-gray-700 text-white"
                            />
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <Input
                              value={feature.label?.fr ?? ""}
                              onChange={(event) =>
                                updateFeatureText(index, "label", "fr", event.target.value)
                              }
                              placeholder="Libellé FR"
                              className="bg-gray-900 border-gray-700 text-white"
                            />
                            <Input
                              value={feature.label?.en ?? ""}
                              onChange={(event) =>
                                updateFeatureText(index, "label", "en", event.target.value)
                              }
                              placeholder="Label EN"
                              className="bg-gray-900 border-gray-700 text-white"
                            />
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <Textarea
                              value={feature.note?.fr ?? ""}
                              onChange={(event) =>
                                updateFeatureText(index, "note", "fr", event.target.value)
                              }
                              placeholder="Note métier FR"
                              rows={3}
                              className="resize-none border-gray-700 bg-gray-900 text-white"
                            />
                            <Textarea
                              value={feature.note?.en ?? ""}
                              onChange={(event) =>
                                updateFeatureText(index, "note", "en", event.target.value)
                              }
                              placeholder="Business note EN"
                              rows={3}
                              className="resize-none border-gray-700 bg-gray-900 text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-cyan-300" />
                        <p className="font-data text-[10px] uppercase text-pk-titane">
                          Atelier zones
                        </p>
                      </div>
                      <span className="font-data text-[9px] uppercase text-pk-titane">
                        {draftInspection?.zones.length ?? 0} élément(s)
                      </span>
                    </div>
                    <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                      {draftInspection?.zones.map((zone, index) => {
                        const pathErrors = svgPathErrors(zone.path, `zone ${index + 1}`);

                        return (
                          <div
                            key={`${zone.id}-${index}`}
                            className="rounded-md border border-white/10 bg-white/[0.03] p-3"
                          >
                            <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_118px_44px]">
                              <Input
                                value={zone.id}
                                onChange={(event) =>
                                  updateZoneAt(index, { id: event.target.value })
                                }
                                aria-label="Identifiant de la zone"
                                className="bg-gray-900 border-gray-700 text-white"
                                data-testid={`circuit-map-zone-id-${index}`}
                              />
                              <select
                                value={zone.kind}
                                onChange={(event) =>
                                  updateZoneAt(index, {
                                    kind: event.target.value as CircuitMapZone["kind"],
                                  })
                                }
                                aria-label="Type de zone"
                                className="h-10 rounded-md border border-gray-700 bg-gray-900 px-2 font-body text-sm text-white"
                              >
                                <option value="sector">Secteur</option>
                                <option value="drs">DRS</option>
                              </select>
                              <Button
                                type="button"
                                onClick={() => removeZoneAt(index)}
                                variant="ghost"
                                size="sm"
                                className="text-red-200 hover:text-red-100"
                                aria-label="Supprimer la zone"
                                data-testid={`remove-circuit-map-zone-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Textarea
                              value={zone.path}
                              onChange={(event) =>
                                updateZoneAt(index, { path: event.target.value })
                              }
                              placeholder="Path SVG de zone"
                              rows={3}
                              className="resize-none border-gray-700 bg-gray-900 font-mono text-xs text-white"
                              data-testid={`circuit-map-zone-path-${index}`}
                            />
                            {pathErrors.length ? (
                              <p className="mt-1 text-xs text-red-200">{pathErrors[0]}</p>
                            ) : null}
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <Input
                                value={zone.label?.fr ?? ""}
                                onChange={(event) =>
                                  updateZoneText(index, "label", "fr", event.target.value)
                                }
                                placeholder="Libellé FR"
                                className="bg-gray-900 border-gray-700 text-white"
                              />
                              <Input
                                value={zone.label?.en ?? ""}
                                onChange={(event) =>
                                  updateZoneText(index, "label", "en", event.target.value)
                                }
                                placeholder="Label EN"
                                className="bg-gray-900 border-gray-700 text-white"
                              />
                            </div>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              <Textarea
                                value={zone.note?.fr ?? ""}
                                onChange={(event) =>
                                  updateZoneText(index, "note", "fr", event.target.value)
                                }
                                placeholder="Note métier FR"
                                rows={3}
                                className="resize-none border-gray-700 bg-gray-900 text-white"
                              />
                              <Textarea
                                value={zone.note?.en ?? ""}
                                onChange={(event) =>
                                  updateZoneText(index, "note", "en", event.target.value)
                                }
                                placeholder="Business note EN"
                                rows={3}
                                className="resize-none border-gray-700 bg-gray-900 text-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Input
                      value={draft.viewBox}
                      onChange={(event) => setDraft({ ...draft, viewBox: event.target.value })}
                      placeholder="viewBox SVG"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <Input
                      value={draft.fallbackImageUrl}
                      onChange={(event) =>
                        setDraft({ ...draft, fallbackImageUrl: event.target.value })
                      }
                      placeholder="Image fallback"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                    <Textarea
                      value={draft.aliases}
                      onChange={(event) => setDraft({ ...draft, aliases: event.target.value })}
                      placeholder="Alias, un par ligne"
                      rows={5}
                      className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                    />
                    <Input
                      value={draft.dataStatus}
                      onChange={(event) => setDraft({ ...draft, dataStatus: event.target.value })}
                      placeholder="Statut data"
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <Textarea
                      value={draft.trackPath}
                      onChange={(event) => setDraft({ ...draft, trackPath: event.target.value })}
                      placeholder="Path SVG principal"
                      rows={4}
                      className="resize-none border-gray-700 bg-gray-900 font-mono text-xs text-white placeholder:text-gray-500"
                    />
                    <Textarea
                      value={draft.racingLinePath}
                      onChange={(event) =>
                        setDraft({ ...draft, racingLinePath: event.target.value })
                      }
                      placeholder="Path SVG racing line"
                      rows={4}
                      className="resize-none border-gray-700 bg-gray-900 font-mono text-xs text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-amber-300" />
                      <p className="font-data text-[10px] uppercase text-pk-titane">
                        Points interactifs
                      </p>
                    </div>
                    <Textarea
                      value={draft.featuresJson}
                      onChange={(event) => setDraft({ ...draft, featuresJson: event.target.value })}
                      rows={16}
                      className="resize-none border-gray-700 bg-gray-900 font-mono text-xs text-white"
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-cyan-300" />
                      <p className="font-data text-[10px] uppercase text-pk-titane">
                        Zones secteurs / DRS
                      </p>
                    </div>
                    <Textarea
                      value={draft.zonesJson}
                      onChange={(event) => setDraft({ ...draft, zonesJson: event.target.value })}
                      rows={16}
                      className="resize-none border-gray-700 bg-gray-900 font-mono text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card-arcade p-10 text-center">
              <Route className="mx-auto mb-3 h-8 w-8 text-pk-titane" />
              <p className="font-body text-sm text-pk-titane">Sélectionne une carte circuit.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
