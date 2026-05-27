/**
 * Admin Races operations tab.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  Edit2,
  Eye,
  Flag,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Race {
  id: string;
  name: string;
  circuit?: string;
  country?: string;
  date: string;
  quali_date?: string;
  race_time?: string;
  quali_time?: string;
  timezone?: string;
  race_start_at?: string | null;
  race_end_at?: string | null;
  race_duration_minutes?: number;
  status?: "upcoming" | "in_progress" | "finished" | "cancelled";
  is_sprint: boolean;
  is_past: boolean;
  has_results: boolean;
  is_cancelled?: boolean;
  is_test_race?: boolean;
  round_number?: number;
  season: number;
  thumbnail_url?: string;
  submitted_predictions?: number;
  missing_predictions?: number;
  completion_rate?: number;
}

interface AdminUserSummary {
  id: string;
  email: string;
  username?: string | null;
}

interface PredictionEntry {
  id: string;
  user: AdminUserSummary;
  is_complete: boolean;
  updated_at?: string;
  quali_pole?: string | null;
  quali_top10: string[];
  sprint_quali_pole?: string | null;
  sprint_quali_top10: string[];
  sprint_race_winner?: string | null;
  sprint_race_top10: string[];
  race_winner?: string | null;
  race_top10: string[];
}

interface RaceOverview {
  race: Race;
  total_users: number;
  submitted_count: number;
  complete_count: number;
  missing_count: number;
  completion_rate: number;
  predictions_close_at?: string | null;
  predictions: PredictionEntry[];
  missing_users: AdminUserSummary[];
}

const emptyForm = {
  name: "",
  circuit: "",
  country: "",
  date: "",
  quali_date: "",
  race_time: "",
  quali_time: "",
  timezone: "Europe/Paris",
  race_duration_minutes: 120,
  is_sprint: false,
  is_cancelled: false,
  is_test_race: false,
  round_number: 1,
  season: 2026,
  thumbnail_url: "",
};

const timezoneOptions = [
  "Europe/Paris",
  "Europe/London",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Baku",
  "Asia/Bahrain",
  "Asia/Qatar",
  "Asia/Dubai",
  "America/New_York",
  "America/Chicago",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Australia/Melbourne",
];

function formatDate(value?: string | null, timeZone?: string | null) {
  if (!value) return "Non planifie";
  return new Date(value.includes("T") ? value : `${value}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timeZone || undefined,
  });
}

function formatDateTime(value?: string | null, timeZone?: string | null) {
  if (!value) return "Non configuree";
  return new Date(value).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZone || undefined,
  });
}

function formatRaceWindow(race: Race) {
  const timezone = race.timezone || undefined;
  if (!race.race_start_at) return formatDate(race.date, timezone);
  const start = formatDateTime(race.race_start_at, timezone);
  if (!race.race_end_at) return start;
  return `${start} → ${formatDateTime(race.race_end_at, timezone)}`;
}

function podium(values: string[]) {
  return values.length ? values.slice(0, 3).join(" / ") : "Non renseigne";
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(status?: Race["status"]) {
  if (status === "in_progress") return "Course en cours";
  if (status === "finished") return "Course terminée";
  if (status === "cancelled") return "Annulée";
  return "À venir";
}

function statusClass(status?: Race["status"]) {
  if (status === "in_progress") return "text-red-300 bg-red-500/15";
  if (status === "finished") return "text-green-300 bg-green-500/15";
  if (status === "cancelled") return "text-red-300 bg-red-500/15";
  return "text-cyan-300 bg-cyan-500/15";
}

export default function RacesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: races = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "races"],
    queryFn: () => adminApi.races.list(),
  });

  useEffect(() => {
    if (!selectedRaceId && races.length > 0) {
      setSelectedRaceId(races[0].id);
    }
  }, [races, selectedRaceId]);

  const overviewQuery = useQuery<RaceOverview>({
    queryKey: ["admin-bo", "races", selectedRaceId, "predictions-overview"],
    queryFn: () => adminApi.races.predictionsOverview(selectedRaceId!),
    enabled: !!selectedRaceId,
    refetchInterval: 30_000,
  });

  const seedMutation = useMutation({
    mutationFn: () => adminApi.races.seed2026(),
    onSuccess: (data) => {
      toast.success(`${data.inserted} course(s) ajoutee(s), ${data.existing} deja presentes`);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    },
    onError: () => toast.error("Seed calendrier impossible"),
  });

  const reminderMutation = useMutation({
    mutationFn: () =>
      adminApi.races.sendReminders(selectedRaceId!, { send_email: true, send_notification: true }),
    onSuccess: (data) => {
      toast.success(
        `${data.targeted} joueur(s) relance(s), ${data.emails_sent} email(s) envoye(s)`,
      );
      overviewQuery.refetch();
    },
    onError: () => toast.error("Impossible d'envoyer les rappels"),
  });

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const fillTestRace = (phase: "upcoming" | "in_progress" | "finished") => {
    const now = new Date();
    const start = new Date(now);
    let duration = 8;
    if (phase === "upcoming") start.setMinutes(start.getMinutes() + 3);
    if (phase === "in_progress") start.setMinutes(start.getMinutes() - 2);
    if (phase === "finished") {
      start.setMinutes(start.getMinutes() - 12);
      duration = 5;
    }

    setShowForm(true);
    setEditing(null);
    setForm({
      ...emptyForm,
      name: `Course test ${statusLabel(phase).toLowerCase()}`,
      circuit: "Circuit de test",
      country: "Test",
      date: toDateInput(start),
      quali_date: toDateInput(start),
      race_time: toTimeInput(start),
      quali_time: toTimeInput(start),
      timezone: "Europe/Paris",
      race_duration_minutes: duration,
      is_test_race: true,
      round_number: phase === "upcoming" ? 901 : phase === "in_progress" ? 902 : 903,
      thumbnail_url: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        round_number: Number(form.round_number),
        season: Number(form.season),
        race_time: form.race_time || undefined,
        quali_time: form.quali_time || undefined,
        quali_date: form.quali_date || undefined,
        timezone: form.timezone || "Europe/Paris",
        race_duration_minutes: Number(form.race_duration_minutes),
        thumbnail_url: form.thumbnail_url || undefined,
      };
      if (editing) {
        await adminApi.races.update(editing.id, payload);
        toast.success("Course mise à jour");
      } else {
        await adminApi.races.create(payload);
        toast.success("Course créée");
      }
      setShowForm(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleEdit = (race: Race) => {
    setEditing(race);
    setForm({
      name: race.name,
      circuit: race.circuit || "",
      country: race.country || "",
      date: race.date?.slice(0, 10) || "",
      quali_date: race.quali_date?.slice(0, 10) || "",
      race_time: race.race_time || "",
      quali_time: race.quali_time || "",
      timezone: race.timezone || "Europe/Paris",
      race_duration_minutes: race.race_duration_minutes || 120,
      is_sprint: race.is_sprint,
      is_cancelled: Boolean(race.is_cancelled),
      is_test_race: Boolean(race.is_test_race),
      round_number: race.round_number || 1,
      season: race.season,
      thumbnail_url: race.thumbnail_url || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer la course "${name}" ?`)) return;
    try {
      await adminApi.races.delete(id);
      toast.success("Course supprimée");
      if (selectedRaceId === id) setSelectedRaceId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const selectedRace = races.find((race: Race) => race.id === selectedRaceId);
  const overview = overviewQuery.data;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Courses</h2>
          <p className="font-body text-xs text-gray-500">
            Calendrier éditable, suivi des pronostics et relances joueurs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => fillTestRace("upcoming")}
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 text-xs"
            size="sm"
          >
            Test à venir
          </Button>
          <Button
            onClick={() => fillTestRace("in_progress")}
            variant="ghost"
            className="text-red-300 hover:text-red-200 text-xs"
            size="sm"
          >
            Test live
          </Button>
          <Button
            onClick={() => fillTestRace("finished")}
            variant="ghost"
            className="text-green-300 hover:text-green-200 text-xs"
            size="sm"
          >
            Test fini
          </Button>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            variant="ghost"
            className="text-cyan-400 hover:text-cyan-300 text-xs"
            size="sm"
          >
            {seedMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            Seed 2026
          </Button>
          <Button
            onClick={() => {
              setShowForm(!showForm);
              resetForm();
            }}
            className="btn-racing text-xs"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle course
          </Button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-arcade p-4 mb-4 border border-orange-500/30 space-y-3"
        >
          <h3 className="font-heading text-sm text-orange-400 uppercase">
            {editing ? "Modifier la course" : "Nouvelle course"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
            <Input
              value={form.circuit}
              onChange={(e) => setForm({ ...form, circuit: e.target.value })}
              placeholder="Circuit"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              placeholder="Pays"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
            <Input
              type="date"
              value={form.quali_date}
              onChange={(e) => setForm({ ...form, quali_date: e.target.value })}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={form.quali_time}
              onChange={(e) => setForm({ ...form, quali_time: e.target.value })}
              placeholder="Heure qualif"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={form.race_time}
              onChange={(e) => setForm({ ...form, race_time: e.target.value })}
              placeholder="Heure course"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white"
              aria-label="Fuseau horaire du circuit"
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={1}
              max={1440}
              value={form.race_duration_minutes}
              onChange={(e) => setForm({ ...form, race_duration_minutes: Number(e.target.value) })}
              placeholder="Durée course (min)"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              type="number"
              value={form.round_number}
              onChange={(e) => setForm({ ...form, round_number: Number(e.target.value) })}
              placeholder="Round"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              type="number"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: Number(e.target.value) })}
              placeholder="Saison"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="Vignette"
              className="bg-gray-900 border-gray-700 text-white md:col-span-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.is_sprint}
              onChange={(e) => setForm({ ...form, is_sprint: e.target.checked })}
              className="rounded border-gray-700"
            />
            Week-end Sprint
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.is_test_race}
              onChange={(e) => setForm({ ...form, is_test_race: e.target.checked })}
              className="rounded border-gray-700"
            />
            Course de test
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.is_cancelled}
              onChange={(e) => setForm({ ...form, is_cancelled: e.target.checked })}
              className="rounded border-gray-700"
            />
            Course annulée
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="btn-racing text-xs">
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 text-xs"
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)] gap-4">
        <section className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : races.length === 0 ? (
            <div className="card-arcade p-8 text-center">
              <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-body text-gray-500">Aucune course. Lancez le seed 2026.</p>
            </div>
          ) : (
            races.map((race: Race) => {
              const isSelected = race.id === selectedRaceId;
              return (
                <div
                  key={race.id}
                  className={`card-arcade p-3 transition-all ${
                    isSelected ? "border-orange-500/50 bg-orange-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => setSelectedRaceId(race.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div
                        className={`w-10 h-10 rounded-md flex items-center justify-center ${
                          race.is_cancelled
                            ? "bg-red-500/15"
                            : race.has_results
                              ? "bg-green-500/20"
                              : "bg-gray-800"
                        }`}
                      >
                        <Flag
                          className={`w-4 h-4 ${
                            race.is_cancelled
                              ? "text-red-400"
                              : race.has_results
                                ? "text-green-400"
                                : "text-gray-500"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-white text-sm flex flex-wrap items-center gap-2">
                          <span className="truncate">
                            {race.round_number}. {race.name}
                          </span>
                          {race.is_sprint && <Zap className="w-3 h-3 text-purple-400" />}
                          {race.is_test_race && (
                            <span className="text-[10px] text-cyan-300 bg-cyan-500/15 px-1 rounded">
                              Test
                            </span>
                          )}
                          <span className={`text-[10px] px-1 rounded ${statusClass(race.status)}`}>
                            {statusLabel(race.status)}
                          </span>
                          {race.is_cancelled && (
                            <span className="text-[10px] text-red-300 bg-red-500/15 px-1 rounded">
                              Annulée
                            </span>
                          )}
                          {race.has_results && (
                            <span className="text-[10px] text-green-400 bg-green-500/20 px-1 rounded">
                              Résultats
                            </span>
                          )}
                        </p>
                        <p className="font-body text-xs text-gray-500">
                          {race.circuit && `${race.circuit} • `}
                          {formatRaceWindow(race)}
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-data text-gray-500">
                          {race.is_cancelled ? (
                            <span className="text-red-300">relances désactivées</span>
                          ) : (
                            <>
                              <span className="text-cyan-400">
                                {race.submitted_predictions ?? 0}
                              </span>
                              <span>/</span>
                              <span>
                                {(race.submitted_predictions ?? 0) +
                                  (race.missing_predictions ?? 0)}
                              </span>
                              <span>pronos</span>
                              <span className="text-orange-400">{race.completion_rate ?? 0}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedRaceId(race.id)}
                        className="p-2 text-gray-400 hover:text-white rounded"
                        title="Voir les pronostics"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(race)}
                        className="p-2 text-gray-400 hover:text-cyan-400 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(race.id, race.name)}
                        className="p-2 text-gray-400 hover:text-red-400 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="card-arcade p-4 min-h-[520px]">
          {!selectedRace ? (
            <div className="h-full flex items-center justify-center text-center text-gray-500 font-body">
              Sélectionnez une course.
            </div>
          ) : overviewQuery.isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-data text-[10px] uppercase tracking-[0.16em] text-orange-400">
                    Round {selectedRace.round_number}
                    {selectedRace.is_cancelled ? " • annulée" : ""}
                    {selectedRace.is_test_race ? " • test" : ""}
                  </p>
                  <h3 className="font-heading text-xl uppercase text-white">{selectedRace.name}</h3>
                  <p className="font-body text-xs text-gray-500">
                    {selectedRace.circuit} • clôture{" "}
                    {formatDateTime(overview?.predictions_close_at, selectedRace.timezone)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`font-data text-[10px] uppercase px-2 py-1 rounded ${statusClass(selectedRace.status)}`}
                    >
                      {statusLabel(selectedRace.status)}
                    </span>
                    <span className="font-data text-[10px] uppercase px-2 py-1 rounded bg-white/5 text-gray-400">
                      {selectedRace.timezone || "Europe/Paris"}
                    </span>
                    <span className="font-data text-[10px] uppercase px-2 py-1 rounded bg-white/5 text-gray-400">
                      {selectedRace.race_duration_minutes || 120} min
                    </span>
                    {selectedRace.race_end_at && (
                      <span className="font-data text-[10px] uppercase px-2 py-1 rounded bg-white/5 text-gray-400">
                        fin {formatDateTime(selectedRace.race_end_at, selectedRace.timezone)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={
                    selectedRace.is_cancelled ||
                    !overview?.missing_count ||
                    reminderMutation.isPending
                  }
                  onClick={() => reminderMutation.mutate()}
                  className="btn-racing text-xs"
                >
                  {reminderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-1" />
                  )}
                  Relancer
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/30 border border-white/10 rounded-md p-3">
                  <Users className="w-4 h-4 text-cyan-400 mb-2" />
                  <p className="font-data text-xl text-white">{overview?.submitted_count ?? 0}</p>
                  <p className="font-body text-[10px] text-gray-500">Soumis</p>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-md p-3">
                  <Bell className="w-4 h-4 text-orange-400 mb-2" />
                  <p className="font-data text-xl text-white">{overview?.missing_count ?? 0}</p>
                  <p className="font-body text-[10px] text-gray-500">À relancer</p>
                </div>
                <div className="bg-black/30 border border-white/10 rounded-md p-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mb-2" />
                  <p className="font-data text-xl text-white">{overview?.completion_rate ?? 0}%</p>
                  <p className="font-body text-[10px] text-gray-500">Couverture</p>
                </div>
              </div>

              <div>
                <h4 className="font-heading text-sm uppercase text-white mb-2">
                  Joueurs sans prono
                </h4>
                {selectedRace.is_cancelled ? (
                  <p className="font-body text-sm text-red-300">
                    Course annulée : relances désactivées pour ce week-end.
                  </p>
                ) : overview?.missing_users.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {overview.missing_users.map((user) => (
                      <div
                        key={user.id}
                        className="border border-white/10 rounded-md p-2 bg-black/20"
                      >
                        <p className="font-body text-sm text-white truncate">
                          {user.username || "Pseudo non défini"}
                        </p>
                        <p className="font-body text-[11px] text-gray-500 truncate">{user.email}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-sm text-green-400">
                    Tous les joueurs actifs ont pronostiqué.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-heading text-sm uppercase text-white mb-2">
                  Pronostics soumis
                </h4>
                {overview?.predictions.length ? (
                  <div className="space-y-2">
                    {overview.predictions.map((prediction) => (
                      <div
                        key={prediction.id}
                        className="border border-white/10 rounded-md p-3 bg-black/20"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-body text-sm text-white">
                              {prediction.user.username || prediction.user.email}
                            </p>
                            <p className="font-body text-[11px] text-gray-500">
                              {prediction.is_complete ? "Complet" : "Partiel"} • maj{" "}
                              {formatDateTime(prediction.updated_at)}
                            </p>
                          </div>
                          <span
                            className={`font-data text-[10px] uppercase px-2 py-1 rounded ${
                              prediction.is_complete
                                ? "bg-green-500/15 text-green-400"
                                : "bg-yellow-500/15 text-yellow-400"
                            }`}
                          >
                            {prediction.is_complete ? "OK" : "Partiel"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <p className="font-body text-gray-400">
                            Pole :{" "}
                            <span className="text-white">{prediction.quali_pole || "—"}</span>
                          </p>
                          <p className="font-body text-gray-400">
                            Vainqueur :{" "}
                            <span className="text-white">{prediction.race_winner || "—"}</span>
                          </p>
                          <p className="font-body text-gray-400 md:col-span-2">
                            Top 3 qualif :{" "}
                            <span className="text-white">{podium(prediction.quali_top10)}</span>
                          </p>
                          <p className="font-body text-gray-400 md:col-span-2">
                            Top 3 course :{" "}
                            <span className="text-white">{podium(prediction.race_top10)}</span>
                          </p>
                          {selectedRace.is_sprint && (
                            <>
                              <p className="font-body text-gray-400 md:col-span-2">
                                Top 3 sprint qualif :{" "}
                                <span className="text-white">
                                  {podium(prediction.sprint_quali_top10)}
                                </span>
                              </p>
                              <p className="font-body text-gray-400 md:col-span-2">
                                Top 3 sprint :{" "}
                                <span className="text-white">
                                  {podium(prediction.sprint_race_top10)}
                                </span>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body text-sm text-gray-500">
                    Aucun pronostic soumis pour cette course.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
