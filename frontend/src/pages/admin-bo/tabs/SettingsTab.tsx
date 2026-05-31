/**
 * Admin Settings tab — application settings + branding controls.
 */
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  Palette,
  Save,
  Settings,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { AdminMediaThumbnailPicker } from "../AdminMediaThumbnailPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  applyBranding,
  DEFAULT_BRANDING,
  emitBrandingUpdated,
  normalizeBranding,
  type BrandingSettings,
} from "@/lib/branding";

type SettingsForm = BrandingSettings & {
  app_description: string;
  maintenance_mode: boolean;
  registration_open: boolean;
  max_leagues_per_user: number;
  current_season: number;
  pwa_enabled: boolean;
  admin_pwa_enabled: boolean;
  pwa_start_url: string;
};

const DEFAULT_FORM: SettingsForm = {
  ...DEFAULT_BRANDING,
  app_description: "",
  maintenance_mode: false,
  registration_open: true,
  max_leagues_per_user: 5,
  current_season: 2026,
  pwa_enabled: true,
  admin_pwa_enabled: true,
  pwa_start_url: "/admin",
};

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const LOGO_FIELDS: Array<{
  key: keyof Pick<
    SettingsForm,
    "logo_url" | "wordmark_dark_url" | "wordmark_light_url" | "symbol_dark_url" | "symbol_light_url"
  >;
  label: string;
  folder: string;
}> = [
  {
    key: "logo_url",
    label: "Logo principal",
    folder: "branding/logos",
  },
  {
    key: "wordmark_dark_url",
    label: "Wordmark sur fond sombre",
    folder: "branding/logos/wordmarks",
  },
  {
    key: "wordmark_light_url",
    label: "Wordmark sur fond clair",
    folder: "branding/logos/wordmarks",
  },
  {
    key: "symbol_dark_url",
    label: "Symbole sur fond sombre",
    folder: "branding/logos/symboles",
  },
  {
    key: "symbol_light_url",
    label: "Symbole sur fond clair",
    folder: "branding/logos/symboles",
  },
];

const ICON_FIELDS: Array<{
  key: keyof Pick<
    SettingsForm,
    | "app_icon_url"
    | "favicon_url"
    | "apple_touch_icon_url"
    | "pwa_icon_192_url"
    | "pwa_icon_512_url"
  >;
  label: string;
  folder: string;
}> = [
  {
    key: "app_icon_url",
    label: "Icône app source",
    folder: "branding/icons",
  },
  {
    key: "favicon_url",
    label: "Favicon navigateur",
    folder: "branding/icons/favicon",
  },
  {
    key: "apple_touch_icon_url",
    label: "Apple touch icon",
    folder: "branding/icons/pwa",
  },
  {
    key: "pwa_icon_192_url",
    label: "PWA 192 px",
    folder: "branding/icons/pwa",
  },
  {
    key: "pwa_icon_512_url",
    label: "PWA 512 px",
    folder: "branding/icons/pwa",
  },
];

function colorInputValue(value: string, fallback: string): string {
  return COLOR_PATTERN.test(value) ? value : fallback;
}

function numberFromInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildForm(settings: Partial<SettingsForm> | undefined): SettingsForm {
  const branding = normalizeBranding(settings);
  return {
    ...DEFAULT_FORM,
    ...settings,
    ...branding,
    app_description: settings?.app_description ?? DEFAULT_FORM.app_description,
    maintenance_mode: settings?.maintenance_mode ?? DEFAULT_FORM.maintenance_mode,
    registration_open: settings?.registration_open ?? DEFAULT_FORM.registration_open,
    max_leagues_per_user: settings?.max_leagues_per_user ?? DEFAULT_FORM.max_leagues_per_user,
    current_season: settings?.current_season ?? DEFAULT_FORM.current_season,
    pwa_enabled: settings?.pwa_enabled ?? DEFAULT_FORM.pwa_enabled,
    admin_pwa_enabled: settings?.admin_pwa_enabled ?? DEFAULT_FORM.admin_pwa_enabled,
    pwa_start_url: settings?.pwa_start_url ?? DEFAULT_FORM.pwa_start_url,
  };
}

export default function SettingsTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsForm>(DEFAULT_FORM);

  const [show2fa, setShow2fa] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [enabling2fa, setEnabling2fa] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-bo", "settings"],
    queryFn: () => adminApi.settings.get(),
  });

  const { data: adminInfo } = useQuery({
    queryKey: ["admin-bo", "me"],
    queryFn: () => adminApi.me().then((r) => r.data),
  });

  useEffect(() => {
    if (!settings) return;
    const nextForm = buildForm(settings);
    setForm(nextForm);
    applyBranding(nextForm);
  }, [settings]);

  const previewStyle = useMemo(
    () => ({
      borderColor: form.primary_color,
      boxShadow: `0 0 22px ${form.primary_color}33`,
    }),
    [form.primary_color],
  );

  const updateField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const { app_name: _lockedAppName, ...payload } = form;
      await adminApi.settings.update(payload);
      applyBranding(form);
      emitBrandingUpdated(form);
      await queryClient.invalidateQueries({ queryKey: ["admin-bo", "settings"] });
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Impossible d'enregistrer les paramètres");
    } finally {
      setSaving(false);
    }
  };

  const handleSetup2fa = async () => {
    try {
      const res = await adminApi.setup2fa();
      setTotpSecret(res.data.secret);
      setShow2fa(true);
    } catch {
      toast.error("Erreur lors de la configuration 2FA");
    }
  };

  const handleEnable2fa = async () => {
    setEnabling2fa(true);
    try {
      await adminApi.verify2faSetup(totpCode);
      toast.success("2FA activée");
      setShow2fa(false);
      setTotpCode("");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "me"] });
    } catch {
      toast.error("Code invalide");
    } finally {
      setEnabling2fa(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-pk-red" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 font-heading text-2xl uppercase tracking-tight text-white">Paramètres</h2>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="card-arcade p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-heading text-sm uppercase text-pk-red">
                <Palette className="h-4 w-4" />
                Branding
              </h3>
              <p className="mt-1 font-body text-xs text-gray-500">
                Logos, favicon et couleurs du thème applicatif.
              </p>
            </div>
            <div className="rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-right">
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Nom verrouillé
              </p>
              <p className="font-heading text-sm uppercase text-white">{form.app_name}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 flex items-center gap-1.5 font-body text-xs text-gray-400">
                  <Lock className="h-3.5 w-3.5 text-gray-500" />
                  Nom de l'app
                </label>
                <Input
                  value={form.app_name}
                  readOnly
                  disabled
                  className="border-gray-700 bg-gray-900/70 text-gray-400"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs text-gray-400">
                  Description courte
                </label>
                <Input
                  value={form.app_description}
                  onChange={(event) => updateField("app_description", event.target.value)}
                  className="border-gray-700 bg-gray-900 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs text-gray-400">
                  Couleur principale
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorInputValue(form.primary_color, DEFAULT_BRANDING.primary_color)}
                    onChange={(event) => updateField("primary_color", event.target.value)}
                    className="h-9 w-10 cursor-pointer rounded-sm border border-white/10 bg-gray-900"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(event) => updateField("primary_color", event.target.value)}
                    className="flex-1 border-gray-700 bg-gray-900 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-body text-xs text-gray-400">
                  Couleur d'accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorInputValue(form.accent_color, DEFAULT_BRANDING.accent_color)}
                    onChange={(event) => updateField("accent_color", event.target.value)}
                    className="h-9 w-10 cursor-pointer rounded-sm border border-white/10 bg-gray-900"
                  />
                  <Input
                    value={form.accent_color}
                    onChange={(event) => updateField("accent_color", event.target.value)}
                    className="flex-1 border-gray-700 bg-gray-900 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/30 p-3" style={previewStyle}>
              <p className="mb-3 font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Aperçu
              </p>
              <div className="flex min-h-16 items-center justify-center rounded-md bg-pk-carbon p-3">
                <img
                  src={form.wordmark_dark_url || form.logo_url}
                  alt="PronoKif"
                  className="max-h-10 max-w-[210px] object-contain"
                  draggable={false}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span
                  className="h-9 rounded-sm border border-white/10"
                  style={{ backgroundColor: form.primary_color }}
                  aria-label="Couleur principale"
                />
                <span
                  className="h-9 rounded-sm border border-white/10"
                  style={{ backgroundColor: form.accent_color }}
                  aria-label="Couleur d'accent"
                />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-pk-red" />
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Logos
              </p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {LOGO_FIELDS.map((field) => (
                <AdminMediaThumbnailPicker
                  key={field.key}
                  value={form[field.key]}
                  onValueChange={(value) => updateField(field.key, value)}
                  entityType="app_setting"
                  entityId={`global:${field.key}`}
                  folder={field.folder}
                  label={field.label}
                  testId={`settings-${field.key}-picker`}
                />
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-pk-amber" />
              <p className="font-data text-[10px] uppercase tracking-[0.16em] text-gray-500">
                Icônes navigateur et PWA
              </p>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {ICON_FIELDS.map((field) => (
                <AdminMediaThumbnailPicker
                  key={field.key}
                  value={form[field.key]}
                  onValueChange={(value) => updateField(field.key, value)}
                  entityType="app_setting"
                  entityId={`global:${field.key}`}
                  folder={field.folder}
                  label={field.label}
                  testId={`settings-${field.key}-picker`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="card-arcade p-4">
          <h3 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase text-pk-amber">
            <Settings className="h-4 w-4" />
            Configuration métier
          </h3>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-body text-xs text-gray-400">Saison en cours</label>
              <Input
                type="number"
                value={form.current_season}
                onChange={(event) =>
                  updateField("current_season", numberFromInput(event.target.value, 2026))
                }
                className="border-gray-700 bg-gray-900 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs text-gray-400">
                Max ligues/utilisateur
              </label>
              <Input
                type="number"
                value={form.max_leagues_per_user}
                onChange={(event) =>
                  updateField("max_leagues_per_user", numberFromInput(event.target.value, 5))
                }
                className="border-gray-700 bg-gray-900 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block font-body text-xs text-gray-400">
                URL de démarrage PWA admin
              </label>
              <Input
                value={form.pwa_start_url}
                onChange={(event) => updateField("pwa_start_url", event.target.value)}
                className="border-gray-700 bg-gray-900 text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 font-body text-sm text-gray-400">
              <input
                type="checkbox"
                checked={form.maintenance_mode}
                onChange={(event) => updateField("maintenance_mode", event.target.checked)}
                className="rounded border-gray-700 accent-pk-red"
              />
              Mode maintenance
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-gray-400">
              <input
                type="checkbox"
                checked={form.registration_open}
                onChange={(event) => updateField("registration_open", event.target.checked)}
                className="rounded border-gray-700 accent-pk-red"
              />
              Inscriptions ouvertes
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-gray-400">
              <input
                type="checkbox"
                checked={form.pwa_enabled}
                onChange={(event) => updateField("pwa_enabled", event.target.checked)}
                className="rounded border-gray-700 accent-pk-red"
              />
              PWA front activée
            </label>
            <label className="flex items-center gap-2 font-body text-sm text-gray-400">
              <input
                type="checkbox"
                checked={form.admin_pwa_enabled}
                onChange={(event) => updateField("admin_pwa_enabled", event.target.checked)}
                className="rounded border-gray-700 accent-pk-red"
              />
              PWA admin activée
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="sm" className="btn-racing text-xs">
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </div>
      </form>

      <section className="card-arcade mt-6 p-4">
        <h3 className="mb-4 flex items-center gap-2 font-heading text-sm uppercase text-cyan-400">
          <Shield className="h-4 w-4" />
          Sécurité
        </h3>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-body text-sm text-white">Authentification à deux facteurs (2FA)</p>
            <p className="font-body text-xs text-gray-500">
              {adminInfo?.totp_enabled
                ? "Activée - votre compte est protégé"
                : "Désactivée - activez-la pour une sécurité renforcée"}
            </p>
          </div>
          {!adminInfo?.totp_enabled && (
            <Button
              onClick={handleSetup2fa}
              size="sm"
              variant="outline"
              className="border-cyan-500/50 text-xs text-cyan-400"
            >
              <KeyRound className="mr-1 h-4 w-4" />
              Activer
            </Button>
          )}
        </div>

        {show2fa && (
          <div className="space-y-3 rounded-md border border-cyan-500/30 bg-gray-900 p-4">
            <p className="font-body text-sm text-gray-300">
              Ajoutez ce code secret dans votre application d'authentification.
            </p>
            <div className="rounded-sm bg-black/50 p-3">
              <code className="select-all break-all font-mono text-sm text-cyan-400">
                {totpSecret}
              </code>
            </div>
            <p className="font-body text-xs text-gray-500">
              Puis saisissez le code à 6 chiffres affiché dans votre application :
            </p>
            <div className="flex gap-2">
              <Input
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="000000"
                className="w-32 border-gray-700 bg-gray-800 text-center tracking-widest text-white"
              />
              <Button
                onClick={handleEnable2fa}
                disabled={totpCode.length !== 6 || enabling2fa}
                size="sm"
                className="btn-racing text-xs"
              >
                {enabling2fa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
