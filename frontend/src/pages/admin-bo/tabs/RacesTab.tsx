/**
 * Admin Races operations tab.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Eye,
  FileText,
  Filter,
  Flag,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type RaceContentStatus = "draft" | "ready" | "published";

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
  content_status?: RaceContentStatus;
  track_profile?: string;
  story_angle?: string;
  key_info?: string[];
  public_recap?: string;
  admin_summary?: string;
  cancellation_reason?: string | null;
  cancellation_impact?: string | null;
  user_content_idea?: string;
  editorial?: RaceEditorial;
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
  editorial?: RaceEditorial;
  total_users: number;
  submitted_count: number;
  complete_count: number;
  missing_count: number;
  completion_rate: number;
  predictions_close_at?: string | null;
  predictions: PredictionEntry[];
  missing_users: AdminUserSummary[];
}

interface RaceEditorial {
  content_status: RaceContentStatus;
  track_profile: string;
  story_angle: string;
  key_info: string[];
  public_recap: string;
  admin_summary: string;
  cancellation_reason?: string | null;
  cancellation_impact?: string | null;
  user_content_idea?: string;
  results_digest?: {
    quali_pole?: string | null;
    quali_top3?: string[];
    race_winner?: string | null;
    race_top3?: string[];
    fastest_lap?: string | null;
    dnf_count?: number;
    safety_car?: boolean;
    entered_at?: string | null;
  } | null;
  prediction_digest: {
    submitted: number;
    missing: number;
    total_users: number;
    completion_rate: number;
  };
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
  content_status: "draft" as RaceContentStatus,
  track_profile: "",
  story_angle: "",
  key_info: "",
  public_recap: "",
  admin_summary: "",
  cancellation_reason: "",
  cancellation_impact: "",
  user_content_idea: "",
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
  if (!value) return "Non programmée";
  return new Date(value.includes("T") ? value : `${value}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timeZone || undefined,
  });
}

function formatDateTime(value?: string | null, timeZone?: string | null) {
  if (!value) return "Non configuré";
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
  return values.length ? values.slice(0, 3).join(" / ") : "Non renseigné";
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

function contentStatusLabel(status?: RaceEditorial["content_status"]) {
  if (status === "published") return "Publié";
  if (status === "ready") return "Prêt";
  return "Brouillon";
}

function contentStatusClass(status?: RaceEditorial["content_status"]) {
  if (status === "published") return "bg-green-500/15 text-green-300";
  if (status === "ready") return "bg-cyan-500/15 text-cyan-300";
  return "bg-yellow-500/15 text-yellow-300";
}

function splitLines(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinedLines(values?: string[]) {
  return (values || []).join("\n");
}

function driverList(values?: string[]) {
  return values?.length ? values.join(" / ") : "À confirmer";
}

export default function RacesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "upcoming" | "finished" | "cancelled" | "in_progress"
  >("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data: races = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "races"],
    queryFn: () => adminApi.races.list(),
  });

  const raceList = useMemo(() => (Array.isArray(races) ? races : []), [races]);

  useEffect(() => {
    if (!selectedRaceId && raceList.length > 0) {
      setSelectedRaceId(raceList[0].id);
    }
  }, [raceList, selectedRaceId]);

  const seasonStats = useMemo(() => {
    const total = raceList.length;
    const cancelled = raceList.filter((race: Race) => race.is_cancelled).length;
    const finished = raceList.filter((race: Race) => race.status === "finished").length;
    const live = raceList.filter((race: Race) => race.status === "in_progress").length;
    const upcoming = Math.max(total - cancelled - finished - live, 0);
    const coverageValues = raceList
      .filter((race: Race) => !race.is_cancelled)
      .map((race: Race) => race.completion_rate ?? 0);
    const averageCoverage = coverageValues.length
      ? Math.round(
          coverageValues.reduce((sum: number, value: number) => sum + value, 0) /
            coverageValues.length,
        )
      : 0;
    const nextRace = raceList.find(
      (race: Race) => !race.is_cancelled && race.status !== "finished",
    );

    return { total, cancelled, finished, live, upcoming, averageCoverage, nextRace };
  }, [raceList]);

  const filteredRaces = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return raceList.filter((race: Race) => {
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "cancelled" && race.is_cancelled) ||
        (!race.is_cancelled && race.status === statusFilter);
      const matchesSearch =
        !normalizedSearch ||
        [race.name, race.circuit, race.country]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [raceList, search, statusFilter]);

  const overviewQuery = useQuery<RaceOverview>({
    queryKey: ["admin-bo", "races", selectedRaceId, "predictions-overview"],
    queryFn: () => adminApi.races.predictionsOverview(selectedRaceId!),
    enabled: !!selectedRaceId,
    refetchInterval: 30_000,
  });

  const seedMutation = useMutation({
    mutationFn: () => adminApi.races.seed2026(),
    onSuccess: (data) => {
      toast.success(`${data.inserted} course(s) ajoutée(s), ${data.existing} déjà présente(s)`);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "stats"] });
    },
    onError: () => toast.error("Impossible de peupler le calendrier"),
  });

  const reminderMutation = useMutation({
    mutationFn: () =>
      adminApi.races.sendReminders(selectedRaceId!, { send_email: true, send_notification: true }),
    onSuccess: (data) => {
      toast.success(
        `${data.targeted} joueur(s) relancé(s), ${data.emails_sent} e-mail(s) envoyé(s)`,
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
      name: `Race test ${statusLabel(phase).toLowerCase()}`,
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
        track_profile: form.track_profile || undefined,
        story_angle: form.story_angle || undefined,
        key_info: splitLines(form.key_info),
        public_recap: form.public_recap || undefined,
        admin_summary: form.admin_summary || undefined,
        cancellation_reason: form.cancellation_reason || undefined,
        cancellation_impact: form.cancellation_impact || undefined,
        user_content_idea: form.user_content_idea || undefined,
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
      content_status: race.content_status || race.editorial?.content_status || "draft",
      track_profile: race.track_profile || race.editorial?.track_profile || "",
      story_angle: race.story_angle || race.editorial?.story_angle || "",
      key_info: joinedLines(race.key_info || race.editorial?.key_info),
      public_recap: race.public_recap || race.editorial?.public_recap || "",
      admin_summary: race.admin_summary || race.editorial?.admin_summary || "",
      cancellation_reason: race.cancellation_reason || race.editorial?.cancellation_reason || "",
      cancellation_impact: race.cancellation_impact || race.editorial?.cancellation_impact || "",
      user_content_idea: race.user_content_idea || race.editorial?.user_content_idea || "",
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

  const selectedRace = raceList.find((race: Race) => race.id === selectedRaceId);
  const overview = overviewQuery.data;
  const editorial = overview?.editorial || selectedRace?.editorial;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Courses</h2>
          <p className="font-body text-xs text-gray-500">
            Calendrier éditorial, suivi des pronostics et rappels aux joueurs.
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
            Test en direct
          </Button>
          <Button
            onClick={() => fillTestRace("finished")}
            variant="ghost"
            className="text-green-300 hover:text-green-200 text-xs"
            size="sm"
          >
            Test terminé
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

      <div className="grid grid-cols-2 gap-3 mb-4 lg:grid-cols-5">
        <div className="card-arcade border-l-4 border-pk-red p-3">
          <Trophy className="mb-2 h-4 w-4 text-pk-red" />
          <p className="font-data text-2xl text-white">{seasonStats.total}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Courses 2026</p>
        </div>
        <div className="card-arcade border-l-4 border-green-500 p-3">
          <CheckCircle2 className="mb-2 h-4 w-4 text-green-400" />
          <p className="font-data text-2xl text-white">{seasonStats.finished}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Résumés attendus</p>
        </div>
        <div className="card-arcade border-l-4 border-cyan-500 p-3">
          <CalendarClock className="mb-2 h-4 w-4 text-cyan-400" />
          <p className="font-data text-2xl text-white">{seasonStats.upcoming}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">À venir</p>
        </div>
        <div className="card-arcade border-l-4 border-red-500 p-3">
          <XCircle className="mb-2 h-4 w-4 text-red-400" />
          <p className="font-data text-2xl text-white">{seasonStats.cancelled}</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Annulées</p>
        </div>
        <div className="card-arcade border-l-4 border-orange-500 p-3">
          <Users className="mb-2 h-4 w-4 text-orange-400" />
          <p className="font-data text-2xl text-white">{seasonStats.averageCoverage}%</p>
          <p className="font-body text-[10px] uppercase text-gray-500">Couverture moy.</p>
        </div>
      </div>

      <div className="card-arcade mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-red">
              Résumé du championnat
            </p>
            <p className="font-body text-sm text-gray-300">
              {seasonStats.nextRace
                ? `Prochain événement : ${seasonStats.nextRace.name}, ${formatRaceWindow(seasonStats.nextRace)}.`
                : "Tous les week-ends actifs ont été traités."}
            </p>
          </div>
          <div className="flex min-w-[260px] items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par GP, circuit, pays..."
              className="border-gray-700 bg-gray-900 text-white"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["all", "Toutes"],
            ["upcoming", "À venir"],
            ["in_progress", "En direct"],
            ["finished", "Terminées"],
            ["cancelled", "Annulées"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setStatusFilter(
                  key as "all" | "upcoming" | "finished" | "cancelled" | "in_progress",
                )
              }
              className={`min-h-9 rounded-md border px-3 font-body text-xs transition ${
                statusFilter === key
                  ? "border-pk-red bg-pk-red/15 text-white"
                  : "border-white/10 text-gray-500 hover:border-white/20 hover:text-white"
              }`}
            >
              <Filter className="mr-1 inline h-3 w-3" />
              {label}
            </button>
          ))}
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
              placeholder="Heure des qualifications"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              value={form.race_time}
              onChange={(e) => setForm({ ...form, race_time: e.target.value })}
              placeholder="Heure de la course"
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
              placeholder="Durée de la course (min)"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              type="number"
              value={form.round_number}
              onChange={(e) => setForm({ ...form, round_number: Number(e.target.value) })}
              placeholder="Manche"
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
              placeholder="Miniature"
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
            Week-end sprint
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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="grid gap-1 text-xs text-gray-500">
              Statut du contenu
              <select
                value={form.content_status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    content_status: e.target.value as "draft" | "ready" | "published",
                  })
                }
                className="h-10 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-white"
              >
                <option value="draft">Brouillon</option>
                <option value="ready">Prêt à publier</option>
                <option value="published">Publié</option>
              </select>
            </label>
            <Textarea
              value={form.story_angle}
              onChange={(e) => setForm({ ...form, story_angle: e.target.value })}
              placeholder="Angle éditorial du week-end"
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Textarea
              value={form.track_profile}
              onChange={(e) => setForm({ ...form, track_profile: e.target.value })}
              placeholder="Profil du circuit"
              rows={3}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Textarea
              value={form.key_info}
              onChange={(e) => setForm({ ...form, key_info: e.target.value })}
              placeholder="Infos clés, une par ligne"
              rows={4}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Textarea
              value={form.public_recap}
              onChange={(e) => setForm({ ...form, public_recap: e.target.value })}
              placeholder="Résumé public / récap de la course précédente"
              rows={4}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            <Textarea
              value={form.admin_summary}
              onChange={(e) => setForm({ ...form, admin_summary: e.target.value })}
              placeholder="Résumé admin"
              rows={4}
              className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
            />
            {form.is_cancelled && (
              <>
                <Textarea
                  value={form.cancellation_reason}
                  onChange={(e) => setForm({ ...form, cancellation_reason: e.target.value })}
                  placeholder="Raison / statut officiel d'annulation"
                  rows={3}
                  className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                />
                <Textarea
                  value={form.cancellation_impact}
                  onChange={(e) => setForm({ ...form, cancellation_impact: e.target.value })}
                  placeholder="Impact joueurs : scoring, rappels, contenu de remplacement"
                  rows={3}
                  className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                />
                <Textarea
                  value={form.user_content_idea}
                  onChange={(e) => setForm({ ...form, user_content_idea: e.target.value })}
                  placeholder="Idée de contenu pour maintenir l'engagement"
                  rows={3}
                  className="resize-none border-gray-700 bg-gray-900 text-white placeholder:text-gray-500"
                />
              </>
            )}
          </div>
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
          ) : filteredRaces.length === 0 ? (
            <div className="card-arcade p-8 text-center">
              <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-body text-gray-500">
                {raceList.length === 0
                  ? "Aucune course. Lancez le peuplement 2026."
                  : "Aucune course ne correspond à ce filtre."}
              </p>
            </div>
          ) : (
            filteredRaces.map((race: Race) => {
              const isSelected = race.id === selectedRaceId;
              const raceEditorial = race.editorial;
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
                          {raceEditorial && (
                            <span
                              className={`text-[10px] px-1 rounded ${contentStatusClass(
                                raceEditorial.content_status,
                              )}`}
                            >
                              {contentStatusLabel(raceEditorial.content_status)}
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
                        {raceEditorial?.story_angle && (
                          <p className="mt-1 line-clamp-2 font-body text-[11px] text-gray-500">
                            {raceEditorial.story_angle}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-data text-gray-500">
                          {race.is_cancelled ? (
                            <span className="text-red-300">rappels désactivés</span>
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
                    Manche {selectedRace.round_number}
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
                  Envoyer un rappel
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="overflow-hidden rounded-md border border-white/10 bg-black/30">
                  {selectedRace.thumbnail_url ? (
                    <div
                      className="min-h-[160px] bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(90deg, rgba(11,13,18,.92), rgba(11,13,18,.34)), url(${selectedRace.thumbnail_url})`,
                      }}
                    />
                  ) : (
                    <div className="flex min-h-[160px] items-center justify-center bg-pk-red/10">
                      <Flag className="h-10 w-10 text-pk-red" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 font-data text-[10px] uppercase ${contentStatusClass(
                          editorial?.content_status,
                        )}`}
                      >
                        Contenu {contentStatusLabel(editorial?.content_status)}
                      </span>
                      {selectedRace.is_sprint && (
                        <span className="rounded bg-purple-500/15 px-2 py-1 font-data text-[10px] uppercase text-purple-300">
                          Sprint
                        </span>
                      )}
                    </div>
                    <h4 className="mb-2 font-heading text-sm uppercase text-white">
                      Angle éditorial
                    </h4>
                    <p className="font-body text-sm leading-6 text-gray-300">
                      {editorial?.story_angle || "Angle éditorial à définir pour cette course."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-md border border-white/10 bg-black/30 p-3">
                    <MapPin className="mb-2 h-4 w-4 text-cyan-400" />
                    <p className="font-body text-sm text-white">
                      {selectedRace.circuit || "Circuit"}
                    </p>
                    <p className="font-body text-xs text-gray-500">
                      {selectedRace.country || "Pays"}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/30 p-3">
                    <Timer className="mb-2 h-4 w-4 text-orange-400" />
                    <p className="font-body text-sm text-white">
                      Course {formatDateTime(selectedRace.race_start_at, selectedRace.timezone)}
                    </p>
                    <p className="font-body text-xs text-gray-500">
                      Qualifications {formatDate(selectedRace.quali_date, selectedRace.timezone)}{" "}
                      {selectedRace.quali_time || ""}
                    </p>
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/30 p-3">
                    <Radio className="mb-2 h-4 w-4 text-green-400" />
                    <p className="font-body text-sm text-white">
                      {editorial?.track_profile || "Profil du circuit à documenter."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-md border border-white/10 bg-black/30 p-3 lg:col-span-2">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-pk-red" />
                    <h4 className="font-heading text-sm uppercase text-white">Résumé public</h4>
                  </div>
                  <p className="font-body text-sm leading-6 text-gray-300">
                    {editorial?.public_recap || "Aucun résumé public défini."}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-cyan-400" />
                    <h4 className="font-heading text-sm uppercase text-white">Infos clés</h4>
                  </div>
                  <ul className="space-y-1 font-body text-xs text-gray-400">
                    {(editorial?.key_info?.length ? editorial.key_info : ["Info à compléter"]).map(
                      (info: string) => (
                        <li key={info} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pk-red" />
                          <span>{info}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>

              {selectedRace.is_cancelled && (
                <div className="rounded-md border border-red-500/25 bg-red-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-300" />
                    <h4 className="font-heading text-sm uppercase text-white">
                      Course annulée : contenu de remplacement
                    </h4>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <p className="font-body text-sm leading-6 text-red-100/90">
                      <span className="block font-data text-[10px] uppercase text-red-300">
                        Raison
                      </span>
                      {editorial?.cancellation_reason || "À préciser"}
                    </p>
                    <p className="font-body text-sm leading-6 text-red-100/90">
                      <span className="block font-data text-[10px] uppercase text-red-300">
                        Impact
                      </span>
                      {editorial?.cancellation_impact || "Pas de scoring pour cette manche."}
                    </p>
                    <p className="font-body text-sm leading-6 text-red-100/90">
                      <span className="block font-data text-[10px] uppercase text-red-300">
                        À publier
                      </span>
                      {editorial?.user_content_idea || "Sondage ou quiz communautaire."}
                    </p>
                  </div>
                </div>
              )}

              {editorial?.results_digest && (
                <div className="rounded-md border border-green-500/20 bg-green-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-300" />
                    <h4 className="font-heading text-sm uppercase text-white">
                      Résultats et faits marquants
                    </h4>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <p className="font-data text-[10px] uppercase text-green-300">Pole</p>
                      <p className="font-body text-sm text-white">
                        {editorial.results_digest.quali_pole || "À confirmer"}
                      </p>
                    </div>
                    <div>
                      <p className="font-data text-[10px] uppercase text-green-300">Vainqueur</p>
                      <p className="font-body text-sm text-white">
                        {editorial.results_digest.race_winner || "À confirmer"}
                      </p>
                    </div>
                    <div>
                      <p className="font-data text-[10px] uppercase text-green-300">Podium</p>

                      <p className="font-body text-sm text-white">
                        {driverList(editorial.results_digest.race_top3)}
                      </p>
                    </div>
                    <div>
                      <p className="font-data text-[10px] uppercase text-green-300">
                        Bonus histoire
                      </p>
                      <p className="font-body text-sm text-white">
                        {editorial.results_digest.safety_car
                          ? "Voiture de sécurité"
                          : "Course propre"}{" "}
                        • {editorial.results_digest.dnf_count ?? 0} DNF
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="rounded-md border border-white/10 bg-black/30 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-orange-400" />
                  <h4 className="font-heading text-sm uppercase text-white">Résumé admin</h4>
                </div>
                <p className="font-body text-sm leading-6 text-gray-300">
                  {editorial?.admin_summary || "Résumé opérationnel à compléter."}
                </p>
              </div>

              <div>
                <h4 className="font-heading text-sm uppercase text-white mb-2">
                  Joueurs sans pronostics
                </h4>
                {selectedRace.is_cancelled ? (
                  <p className="font-body text-sm text-red-300">
                    Course annulée : rappels désactivés pour ce week-end.
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
                    Tous les joueurs actifs ont soumis leurs pronostics.
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
                            Top 3 qualifications :{" "}
                            <span className="text-white">{podium(prediction.quali_top10)}</span>
                          </p>
                          <p className="font-body text-gray-400 md:col-span-2">
                            Top 3 course :{" "}
                            <span className="text-white">{podium(prediction.race_top10)}</span>
                          </p>
                          {selectedRace.is_sprint && (
                            <>
                              <p className="font-body text-gray-400 md:col-span-2">
                                Top 3 qualifications sprint :{" "}
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
