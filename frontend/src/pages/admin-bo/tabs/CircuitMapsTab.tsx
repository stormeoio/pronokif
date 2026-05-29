import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Layers,
  Loader2,
  MapPinned,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { CircuitMap } from "@/components/CircuitMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CircuitMapData, CircuitMapFeature, CircuitMapZone } from "@/lib/circuitMaps";

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
    features_count: number;
    zones_count: number;
    missing_translations: number;
    warnings: string[];
    ready_for_public: boolean;
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
  };
};

type CircuitMapDraft = {
  viewBox: string;
  trackPath: string;
  racingLinePath: string;
  fallbackImageUrl: string;
  aliases: string;
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

const REVIEW_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "", label: "Non revus" },
  { value: "draft", label: "Brouillon" },
  { value: "in_review", label: "En revue" },
  { value: "needs_source", label: "Source à vérifier" },
  { value: "approved", label: "Validés" },
] as const;

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

  const missingTranslations =
    features.filter(
      (feature) => translationMissing(feature.label) || translationMissing(feature.note),
    ).length +
    zones.filter((zone) => translationMissing(zone.label) || translationMissing(zone.note)).length;
  const warnings = [
    !draft.fallbackImageUrl.trim() ? "Image fallback manquante" : "",
    !draft.trackPath.trim() ? "Path SVG principal manquant" : "",
    features.length === 0 ? "Aucun point interactif" : "",
    zones.length === 0 ? "Aucune zone DRS/secteur" : "",
    missingTranslations > 0 ? "Traductions fr/en incomplètes" : "",
  ].filter(Boolean);

  return {
    errors,
    warnings,
    features,
    zones,
    missingTranslations,
    readyForPublic: errors.length === 0 && warnings.length === 0,
  };
}

function adminMutationErrorMessage(error: unknown) {
  const maybeResponse = error as { response?: { data?: { detail?: string } } };
  return maybeResponse.response?.data?.detail || "Impossible de sauvegarder la carte circuit";
}

export default function CircuitMapsTab({ currentAdminEmail = "" }: CircuitMapsTabProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<CircuitMapDraft | null>(null);
  const [jsonError, setJsonError] = useState("");

  const params = useMemo(
    () => ({
      q: query.trim() || undefined,
      review_status: reviewStatus === "all" ? undefined : reviewStatus,
      limit: 80,
    }),
    [query, reviewStatus],
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

  useEffect(() => {
    if (!selectedKey && items[0]) {
      setSelectedKey(items[0].key);
    }
  }, [items, selectedKey]);

  useEffect(() => {
    if (selected) {
      setDraft(initialDraft(selected, currentAdminEmail));
      setJsonError("");
    }
  }, [currentAdminEmail, selected]);

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: Record<string, unknown> }) =>
      adminApi.circuitMaps.update(key, payload),
    onSuccess: (response) => {
      toast.success("Carte circuit mise à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "circuit-maps"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "knowledge"] });
      setSelectedKey(response.item?.key || selectedKey);
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
    };

    return {
      map_data: mapData,
      data_status: nextDraft.dataStatus.trim() || undefined,
      review_status: nextDraft.reviewStatus,
      owner_admin_email: nextDraft.ownerAdminEmail.trim() || undefined,
      admin_notes: nextDraft.adminNotes,
    };
  };

  const saveDraft = (nextDraft = draft) => {
    if (!selected || !nextDraft) return;
    try {
      setJsonError("");
      updateMutation.mutate({ key: selected.key, payload: buildPayload(nextDraft) });
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "JSON invalide");
    }
  };

  const patchAndSave = (patch: Partial<CircuitMapDraft>) => {
    if (!draft) return;
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    saveDraft(nextDraft);
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

  const summary = data?.summary;
  const draftInspection = useMemo(() => (draft ? inspectDraft(draft) : null), [draft]);
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
    };
  }, [draft, draftInspection, selected]);

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
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-bo", "circuit-maps"] })}
          variant="ghost"
          className="text-cyan-300 hover:text-cyan-200"
          size="sm"
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          Rafraîchir
        </Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <div className="card-arcade p-4">
          <Route className="mb-2 h-4 w-4 text-pk-red" />
          <p className="font-data text-2xl text-white">{data?.total ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Circuits</p>
        </div>
        <div className="card-arcade p-4">
          <MapPinned className="mb-2 h-4 w-4 text-cyan-400" />
          <p className="font-data text-2xl text-white">{summary?.interactive ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Interactifs</p>
        </div>
        <div className="card-arcade p-4">
          <Layers className="mb-2 h-4 w-4 text-amber-400" />
          <p className="font-data text-2xl text-white">{summary?.static ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Fallback</p>
        </div>
        <div className="card-arcade p-4">
          <UserCheck className="mb-2 h-4 w-4 text-purple-300" />
          <p className="font-data text-2xl text-white">{summary?.admin_overrides ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Overrides</p>
        </div>
        <div className="card-arcade p-4">
          <CheckCircle2 className="mb-2 h-4 w-4 text-emerald-300" />
          <p className="font-data text-2xl text-white">{summary?.approved ?? 0}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Validés</p>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
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
                    onClick={() => setSelectedKey(item.key)}
                    className={`w-full rounded-md border p-3 text-left transition-all ${
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
                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-pk-titane">
                      <span className="rounded bg-white/[0.04] px-2 py-1">
                        {item.source === "admin" ? "Override admin" : "Seed"}
                      </span>
                      <span className="rounded bg-white/[0.04] px-2 py-1">
                        {featureCount} point(s)
                      </span>
                      <span className="rounded bg-white/[0.04] px-2 py-1">{zoneCount} zone(s)</span>
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
                    </div>
                    <span
                      className={`rounded-sm border px-2 py-1 font-data text-[10px] uppercase ${statusClass(draft.reviewStatus)}`}
                    >
                      {statusLabel(draft.reviewStatus)}
                    </span>
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
                      disabled={updateMutation.isPending}
                      variant="ghost"
                      className="text-cyan-300 hover:text-cyan-200"
                      size="sm"
                    >
                      <UserCheck className="mr-1 h-4 w-4" />
                      Prendre
                    </Button>
                    <Button
                      onClick={() => patchAndSave({ reviewStatus: "approved" })}
                      disabled={updateMutation.isPending || !draftInspection?.readyForPublic}
                      variant="ghost"
                      className="text-emerald-300 hover:text-emerald-200"
                      size="sm"
                      data-testid="approve-circuit-map"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Valider
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
                  <Button
                    onClick={() => saveDraft()}
                    disabled={updateMutation.isPending}
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
