/**
 * Admin Settings tab — app customization.
 */
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, Loader2, KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { AdminMediaThumbnailPicker } from "../AdminMediaThumbnailPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    app_name: "",
    app_description: "",
    primary_color: "#f97316",
    accent_color: "#06b6d4",
    logo_url: "",
    favicon_url: "",
    maintenance_mode: false,
    registration_open: true,
    max_leagues_per_user: 5,
    current_season: 2025,
  });

  // 2FA state
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
    if (settings) {
      setForm({
        app_name: settings.app_name || "",
        app_description: settings.app_description || "",
        primary_color: settings.primary_color || "#f97316",
        accent_color: settings.accent_color || "#06b6d4",
        logo_url: settings.logo_url || "",
        favicon_url: settings.favicon_url || "",
        maintenance_mode: settings.maintenance_mode ?? false,
        registration_open: settings.registration_open ?? true,
        max_leagues_per_user: settings.max_leagues_per_user ?? 5,
        current_season: settings.current_season ?? 2025,
      });
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.settings.update(form);
      toast.success("Paramètres enregistrés");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "settings"] });
    } catch {
      toast.error("Erreur");
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
      toast.error("Error lors de la configuration 2FA");
    }
  };

  const handleEnable2fa = async () => {
    setEnabling2fa(true);
    try {
      await adminApi.verify2faSetup(totpCode);
      toast.success("2FA activé !");
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
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-2xl text-white uppercase tracking-tight mb-6">Paramètres</h2>

      {/* App Settings */}
      <form onSubmit={handleSave} className="card-arcade p-4 mb-6 space-y-4">
        <h3 className="font-heading text-sm text-orange-400 uppercase flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Configuration de l'application
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-body text-xs text-gray-400 block mb-1">Nom de l'app</label>
            <Input
              value={form.app_name}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="font-body text-xs text-gray-400 block mb-1">Saison en cours</label>
            <Input
              type="number"
              value={form.current_season}
              onChange={(e) => setForm({ ...form, current_season: parseInt(e.target.value) })}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="font-body text-xs text-gray-400 block mb-1">Couleur principale</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={form.primary_color}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white flex-1"
              />
            </div>
          </div>
          <div>
            <label className="font-body text-xs text-gray-400 block mb-1">Couleur d'accent</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_color}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={form.accent_color}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                className="bg-gray-900 border-gray-700 text-white flex-1"
              />
            </div>
          </div>
          <div>
            <label className="font-body text-xs text-gray-400 block mb-1">
              Max ligues/utilisateur
            </label>
            <Input
              type="number"
              value={form.max_leagues_per_user}
              onChange={(e) => setForm({ ...form, max_leagues_per_user: parseInt(e.target.value) })}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="font-body text-xs text-gray-400 block mb-1">Description</label>
            <Input
              value={form.app_description}
              onChange={(e) => setForm({ ...form, app_description: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="col-span-2 grid gap-3 lg:grid-cols-2">
            <AdminMediaThumbnailPicker
              value={form.logo_url}
              onValueChange={(logo_url) => setForm({ ...form, logo_url })}
              entityType="app_setting"
              entityId="global"
              folder="branding"
              label="Logo applicatif"
              testId="settings-logo-picker"
            />
            <AdminMediaThumbnailPicker
              value={form.favicon_url}
              onValueChange={(favicon_url) => setForm({ ...form, favicon_url })}
              entityType="app_setting"
              entityId="global"
              folder="branding"
              label="Favicon / icône PWA"
              testId="settings-favicon-picker"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.maintenance_mode}
              onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
              className="rounded border-gray-700"
            />
            Mode maintenance
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.registration_open}
              onChange={(e) => setForm({ ...form, registration_open: e.target.checked })}
              className="rounded border-gray-700"
            />
            Inscriptions ouvertes
          </label>
        </div>

        <Button type="submit" disabled={saving} size="sm" className="btn-racing text-xs">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Enregistrer
        </Button>
      </form>

      {/* Security / 2FA */}
      <div className="card-arcade p-4">
        <h3 className="font-heading text-sm text-cyan-400 uppercase flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4" />
          Sécurité
        </h3>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-body text-sm text-white">Authentification à deux facteurs (2FA)</p>
            <p className="font-body text-xs text-gray-500">
              {adminInfo?.totp_enabled
                ? "Activé — votre compte est protégé"
                : "Désactivé — activez-le pour une sécurité renforcée"}
            </p>
          </div>
          {!adminInfo?.totp_enabled && (
            <Button
              onClick={handleSetup2fa}
              size="sm"
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 text-xs"
            >
              <KeyRound className="w-4 h-4 mr-1" />
              Activer
            </Button>
          )}
        </div>

        {show2fa && (
          <div className="bg-gray-900 rounded-xl p-4 border border-cyan-500/30 space-y-3">
            <p className="font-body text-sm text-gray-300">
              Ajoutez ce code secret dans votre application d'authentification (Google
              Authenticator, Authy, etc.) :
            </p>
            <div className="bg-black/50 p-3 rounded-lg">
              <code className="font-mono text-sm text-cyan-400 break-all select-all">
                {totpSecret}
              </code>
            </div>
            <p className="font-body text-xs text-gray-500">
              Puis saisissez le code à 6 chiffres affiché dans votre application :
            </p>
            <div className="flex gap-2">
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                placeholder="000000"
                className="bg-gray-800 border-gray-700 text-white w-32 text-center tracking-widest"
              />
              <Button
                onClick={handleEnable2fa}
                disabled={totpCode.length !== 6 || enabling2fa}
                size="sm"
                className="btn-racing text-xs"
              >
                {enabling2fa ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vérifier et activer"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
