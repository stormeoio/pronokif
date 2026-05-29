import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Scale,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_PAGE_LINKS } from "@/lib/legalContent";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type LegalPageAdmin = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  version: string;
  order?: number;
  title_translations?: Record<string, string>;
  summary_translations?: Record<string, string>;
  content_translations?: Record<string, string>;
  updated_at?: string;
  updated_by?: string;
};

const DEFAULT_SLUG = "mentions-legales";

function isStandalonePwa() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function LegalPwaTab() {
  const queryClient = useQueryClient();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(DEFAULT_SLUG);
  const [legalDraft, setLegalDraft] = useState({
    title: "",
    summary: "",
    content: "",
    status: "published",
    version: "2026.05",
  });
  const [settingsDraft, setSettingsDraft] = useState({
    pwa_enabled: true,
    admin_pwa_enabled: true,
    pwa_start_url: "/admin",
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-bo", "settings"],
    queryFn: () => adminApi.settings.get(),
  });

  const { data: legalData, isLoading: legalLoading } = useQuery({
    queryKey: ["admin-bo", "legal-pages"],
    queryFn: () => adminApi.legal.list({ locale: "fr" }),
  });

  const pages = useMemo(() => (legalData?.pages || []) as LegalPageAdmin[], [legalData]);
  const selectedPage = pages.find((page) => page.slug === selectedSlug) || pages[0];

  useEffect(() => {
    setStandalone(isStandalonePwa());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!settings) return;
    setSettingsDraft({
      pwa_enabled: settings.pwa_enabled ?? true,
      admin_pwa_enabled: settings.admin_pwa_enabled ?? true,
      pwa_start_url: settings.pwa_start_url || "/admin",
    });
  }, [settings]);

  useEffect(() => {
    if (!selectedPage) return;
    setLegalDraft({
      title: selectedPage.title_translations?.fr || selectedPage.title || "",
      summary: selectedPage.summary_translations?.fr || selectedPage.summary || "",
      content: selectedPage.content_translations?.fr || selectedPage.content || "",
      status: selectedPage.status || "published",
      version: selectedPage.version || "2026.05",
    });
  }, [selectedPage]);

  const seedMutation = useMutation({
    mutationFn: () => adminApi.legal.seedDefaults(),
    onSuccess: () => {
      toast.success("Pages légales synchronisées");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "legal-pages"] });
    },
    onError: () => toast.error("Impossible de synchroniser les pages légales"),
  });

  const saveLegalMutation = useMutation({
    mutationFn: () =>
      adminApi.legal.update(selectedPage.slug, {
        title_translations: {
          ...(selectedPage.title_translations || {}),
          fr: legalDraft.title.trim(),
        },
        summary_translations: {
          ...(selectedPage.summary_translations || {}),
          fr: legalDraft.summary.trim(),
        },
        content_translations: {
          ...(selectedPage.content_translations || {}),
          fr: legalDraft.content.trim(),
        },
        status: legalDraft.status,
        version: legalDraft.version.trim(),
      }),
    onSuccess: () => {
      toast.success("Page légale publiée");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "legal-pages"] });
    },
    onError: () => toast.error("Impossible d'enregistrer cette page légale"),
  });

  const savePwaMutation = useMutation({
    mutationFn: () => adminApi.settings.update(settingsDraft),
    onSuccess: () => {
      toast.success("Configuration PWA enregistrée");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "settings"] });
    },
    onError: () => toast.error("Impossible d'enregistrer la configuration PWA"),
  });

  const handleInstall = async () => {
    if (!installPrompt) {
      toast.info("L'installation sera proposée par le navigateur quand la PWA sera éligible.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setStandalone(choice.outcome === "accepted" || isStandalonePwa());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Légal & PWA</h2>
          <p className="mt-1 font-body text-sm text-gray-500">
            Publication des pages publiques et installation du back-office.
          </p>
        </div>
        <Button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          variant="ghost"
          size="sm"
          className="text-cyan-300 hover:text-cyan-200"
        >
          {seedMutation.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Synchroniser
        </Button>
      </div>

      <section className="card-arcade p-4">
        <div className="mb-4 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-pk-red" />
          <h3 className="font-heading text-sm uppercase text-white">PWA administrateur</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 font-body text-sm text-gray-300">
              <input
                type="checkbox"
                checked={settingsDraft.pwa_enabled}
                onChange={(event) =>
                  setSettingsDraft({ ...settingsDraft, pwa_enabled: event.target.checked })
                }
              />
              PWA active
            </label>
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 font-body text-sm text-gray-300">
              <input
                type="checkbox"
                checked={settingsDraft.admin_pwa_enabled}
                onChange={(event) =>
                  setSettingsDraft({ ...settingsDraft, admin_pwa_enabled: event.target.checked })
                }
              />
              BO installable
            </label>
            <Input
              value={settingsDraft.pwa_start_url}
              onChange={(event) =>
                setSettingsDraft({ ...settingsDraft, pwa_start_url: event.target.value })
              }
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="/admin"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={handleInstall}
              variant="ghost"
              size="sm"
              className="text-pk-red hover:text-red-300"
            >
              {standalone ? (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              ) : (
                <Smartphone className="mr-1 h-4 w-4" />
              )}
              {standalone ? "Installée" : "Installer"}
            </Button>
            <Button
              onClick={() => savePwaMutation.mutate()}
              disabled={savePwaMutation.isPending}
              variant="ghost"
              size="sm"
              className="text-cyan-300 hover:text-cyan-200"
            >
              {savePwaMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Sauver PWA
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <div className="card-arcade p-4">
          <div className="mb-3 flex items-center gap-2">
            <Scale className="h-4 w-4 text-orange-400" />
            <h3 className="font-heading text-sm uppercase text-white">Pages publiques</h3>
          </div>
          {legalLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map((page) => {
                const active = page.slug === selectedPage?.slug;
                const publicPath =
                  LEGAL_PAGE_LINKS.find((link) => link.slug === page.slug)?.path ||
                  `/legal/${page.slug}`;
                return (
                  <button
                    key={page.slug}
                    onClick={() => setSelectedSlug(page.slug)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-pk-red/40 bg-pk-red/10"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <span className="block truncate font-body text-sm text-white">
                      {page.title}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2 font-body text-[10px] uppercase text-gray-500">
                      {page.status}
                      <a
                        href={publicPath}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-cyan-300"
                      >
                        Voir <ExternalLink className="h-3 w-3" />
                      </a>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedPage) return;
            saveLegalMutation.mutate();
          }}
          className="card-arcade p-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-400" />
              <h3 className="font-heading text-sm uppercase text-white">Édition FR</h3>
            </div>
            {selectedPage?.updated_by && (
              <p className="font-body text-[10px] uppercase text-gray-500">
                Dernière édition : {selectedPage.updated_by}
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_140px_120px]">
              <Input
                value={legalDraft.title}
                onChange={(event) => setLegalDraft({ ...legalDraft, title: event.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="Titre"
              />
              <Input
                value={legalDraft.version}
                onChange={(event) => setLegalDraft({ ...legalDraft, version: event.target.value })}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="Version"
              />
              <select
                value={legalDraft.status}
                onChange={(event) => setLegalDraft({ ...legalDraft, status: event.target.value })}
                className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 font-body text-sm text-white"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </div>
            <Input
              value={legalDraft.summary}
              onChange={(event) => setLegalDraft({ ...legalDraft, summary: event.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              placeholder="Résumé public"
            />
            <Textarea
              value={legalDraft.content}
              onChange={(event) => setLegalDraft({ ...legalDraft, content: event.target.value })}
              rows={16}
              className="resize-y border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
              placeholder="Contenu public. Utiliser une ligne de titre puis le paragraphe, blocs séparés par une ligne vide."
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              disabled={
                saveLegalMutation.isPending ||
                !selectedPage ||
                !legalDraft.title.trim() ||
                !legalDraft.content.trim()
              }
              variant="ghost"
              size="sm"
              className="text-orange-300 hover:text-orange-200"
            >
              {saveLegalMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Publier
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
