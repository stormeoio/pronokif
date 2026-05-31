import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Languages,
  Loader2,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import fr from "@/i18n/fr";
import en from "@/i18n/en";
import { auditLocaleResources } from "@/i18n/audit";

type LocaleCode = "fr" | "en";

type LocaleCompletion = {
  complete: number;
  total: number;
  rate: number;
};

type TranslationEntry = {
  id: string;
  source: string;
  source_label: string;
  document_id: string;
  document_label: string;
  field: string;
  field_label: string;
  translations: Record<LocaleCode, string>;
  missing_locales: LocaleCode[];
  completion_rate: number;
  updated_at?: string;
  updated_by?: string;
};

type TranslationSource = {
  key: string;
  label: string;
  fields: string[];
};

type TranslationRegistry = {
  locales: LocaleCode[];
  source_locale: LocaleCode;
  sources: TranslationSource[];
  summary: {
    total_entries: number;
    total_translation_slots: number;
    locales: Record<LocaleCode, LocaleCompletion>;
    sources: {
      source: string;
      label: string;
      fields: number;
      locales: Record<LocaleCode, LocaleCompletion>;
    }[];
  };
  entries: TranslationEntry[];
  filtered_total: number;
};

const LOCALE_LABELS: Record<LocaleCode, string> = {
  fr: "Français",
  en: "English",
};

function pct(value?: number) {
  return `${Math.round(value ?? 0)}%`;
}

function ProgressBar({ rate }: { rate: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-pk-red transition-all"
        style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="card-arcade p-4">
      <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-titane">{label}</p>
      <p className={`mt-2 font-heading text-2xl uppercase ${tone}`}>{value}</p>
    </div>
  );
}

export default function TranslationsTab() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [locale, setLocale] = useState<LocaleCode>("en");
  const [missingOnly, setMissingOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const frontendAudit = useMemo(() => auditLocaleResources({ fr, en }), []);
  const params = useMemo(
    () => ({
      source: source || undefined,
      q: query.trim() || undefined,
      locale,
      missing_only: missingOnly,
      limit: 800,
    }),
    [locale, missingOnly, query, source],
  );

  const { data, isLoading, isFetching } = useQuery<TranslationRegistry>({
    queryKey: ["admin-bo", "translations", params],
    queryFn: () => adminApi.translations.registry(params),
  });

  const entries = data?.entries ?? [];
  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null;
  const selectedEntryId = selectedEntry?.id ?? null;
  const selectedEntryValue = selectedEntry?.translations?.[locale] ?? "";

  useEffect(() => {
    if (!selectedEntryId) {
      setSelectedId(null);
      setDraft("");
      return;
    }
    setSelectedId(selectedEntryId);
    setDraft(selectedEntryValue);
  }, [selectedEntryId, selectedEntryValue]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedEntry) throw new Error("missing_entry");
      return adminApi.translations.update(selectedEntry.source, selectedEntry.document_id, {
        field: selectedEntry.field,
        locale,
        value: draft,
      });
    },
    onSuccess: () => {
      toast.success("Traduction enregistrée");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "translations"] });
    },
    onError: () => toast.error("Impossible d'enregistrer cette traduction"),
  });

  const frontendFr = frontendAudit.summaries.fr;
  const frontendEn = frontendAudit.summaries.en;
  const missingFrontendEn = frontendEn?.missingKeys ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">
            Traductions UI front
          </h2>
          <p className="mt-1 font-body text-sm text-gray-500">
            La complétion FR/EN concerne uniquement les ressources i18n de l'interface utilisateur
            front. Les contenus utilisateurs restent dans leur langue d'origine.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-cyan-300 hover:text-cyan-200"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-bo", "translations"] })}
        >
          {isFetching ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="UI front FR" value={pct(frontendFr?.rate)} tone="text-emerald-300" />
        <StatCard label="UI front EN" value={pct(frontendEn?.rate)} tone="text-cyan-300" />
        <StatCard label="Clés UI suivies" value={frontendAudit.keys.length} />
        <StatCard
          label="UI EN manquantes"
          value={missingFrontendEn.length}
          tone={missingFrontendEn.length ? "text-amber-300" : "text-emerald-300"}
        />
      </div>

      <section className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
        <div className="flex flex-wrap items-start gap-3">
          <Languages className="mt-0.5 h-4 w-4 text-cyan-300" />
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm uppercase text-white">Périmètre officiel</h3>
            <p className="mt-1 font-body text-sm leading-relaxed text-gray-400">
              Le score de traduction ignore les noms de ligues, descriptions saisies par les
              joueurs, pronostics, messages de chat, pseudos, scores, feedbacks et données métier
              générées par l'usage. Le back-office administrateur reste volontairement en français.
            </p>
          </div>
        </div>
      </section>

      <section className="card-arcade p-4">
        <div className="mb-4 flex items-center gap-2">
          <Languages className="h-4 w-4 text-pk-red" />
          <h3 className="font-heading text-sm uppercase text-white">Complétion UI front</h3>
        </div>
        <div className="space-y-3">
          {(["fr", "en"] as LocaleCode[]).map((item) => {
            const summary = frontendAudit.summaries[item];
            return (
              <div key={item} className="space-y-1">
                <div className="flex items-center justify-between font-body text-sm text-gray-300">
                  <span>{LOCALE_LABELS[item]}</span>
                  <span>
                    {summary.complete}/{summary.total} · {pct(summary.rate)}
                  </span>
                </div>
                <ProgressBar rate={summary.rate} />
              </div>
            );
          })}
          <p className="pt-1 font-body text-xs text-gray-500">
            Base calculée depuis les fichiers i18n front uniquement. Aucun contenu joueur ou donnée
            de ligue n'entre dans ce taux.
          </p>
        </div>
      </section>

      <section className="card-arcade p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-sm uppercase text-white">
              Contenus système hors score UI
            </h3>
            <p className="mt-1 font-body text-xs text-gray-500">
              Outil interne pour les contenus système locale-keyed. Les ligues, pronostics, chats et
              données des joueurs sont exclus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["fr", "en"] as LocaleCode[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={`rounded-md border px-3 py-2 font-data text-[10px] uppercase tracking-[0.16em] transition ${
                  locale === item
                    ? "border-pk-red bg-pk-red text-white"
                    : "border-white/10 bg-black/20 text-pk-titane hover:text-white"
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pk-titane" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un contenu système, un champ ou une traduction..."
              className="pl-9"
            />
          </div>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="h-10 rounded-md border border-white/10 bg-black/30 px-3 font-body text-sm text-gray-200"
          >
            <option value="">Toutes les sources</option>
            {(data?.sources ?? []).map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 font-body text-sm text-gray-300">
            <input
              type="checkbox"
              checked={missingOnly}
              onChange={(event) => setMissingOnly(event.target.checked)}
            />
            Manquantes
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-h-[320px] overflow-hidden rounded-md border border-white/10">
            <div className="grid grid-cols-[1.2fr_1fr_96px] border-b border-white/10 bg-white/[0.03] px-3 py-2 font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
              <span>Contenu système</span>
              <span>Champ</span>
              <span>État</span>
            </div>
            {isLoading ? (
              <div className="flex h-72 items-center justify-center text-pk-titane">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex h-72 items-center justify-center px-6 text-center font-body text-sm text-gray-500">
                Aucun champ ne correspond aux filtres.
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                {entries.map((entry) => {
                  const active = entry.id === selectedEntry?.id;
                  const missing = entry.missing_locales.includes(locale);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`grid w-full grid-cols-[1.2fr_1fr_96px] gap-3 border-b border-white/5 px-3 py-3 text-left transition ${
                        active ? "bg-pk-red/15" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-body text-sm text-white">
                          {entry.document_label}
                        </span>
                        <span className="block truncate font-data text-[10px] uppercase tracking-[0.14em] text-pk-titane">
                          {entry.source_label}
                        </span>
                      </span>
                      <span className="truncate font-body text-sm text-gray-300">
                        {entry.field_label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-data text-[10px] uppercase tracking-[0.12em] ${
                          missing ? "text-amber-300" : "text-emerald-300"
                        }`}
                      >
                        {missing ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {missing ? "À faire" : "OK"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-md border border-white/10 bg-black/20 p-4">
            {selectedEntry ? (
              <div className="space-y-4">
                <div>
                  <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-titane">
                    {selectedEntry.source_label}
                  </p>
                  <h4 className="mt-1 font-heading text-lg uppercase text-white">
                    {selectedEntry.document_label}
                  </h4>
                  <p className="mt-1 font-body text-sm text-gray-500">
                    {selectedEntry.field_label}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-titane">
                    Source FR
                  </label>
                  <div className="max-h-36 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 font-body text-sm text-gray-300">
                    {selectedEntry.translations.fr || "Aucun contenu français enregistré."}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-titane">
                    Traduction {locale.toUpperCase()}
                  </label>
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="min-h-56"
                    placeholder={`Saisir la version ${LOCALE_LABELS[locale]}...`}
                  />
                </div>

                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="w-full"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center text-center font-body text-sm text-gray-500">
                Sélectionne un contenu pour voir ou modifier sa traduction.
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="card-arcade p-4">
        <div className="mb-3 flex items-center gap-2">
          {missingFrontendEn.length ? (
            <AlertTriangle className="h-4 w-4 text-amber-300" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          )}
          <h3 className="font-heading text-sm uppercase text-white">Audit UI front utilisateur</h3>
        </div>
        <p className="font-body text-sm text-gray-500">
          Les fichiers i18n déclarés sont alignés FR/EN sur {frontendAudit.keys.length} clé(s). Les
          chaînes de l'interface utilisateur encore codées en dur doivent être migrées vers ces
          ressources pour entrer dans ce taux. Le back-office admin reste en français et hors
          comptage i18n.
        </p>
        {missingFrontendEn.length > 0 && (
          <div className="mt-3 max-h-36 overflow-auto rounded-md border border-white/10 bg-black/20 p-3 font-data text-xs text-amber-200">
            {missingFrontendEn.join(", ")}
          </div>
        )}
      </section>
    </div>
  );
}
