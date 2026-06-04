/**
 * Admin Drivers & Teams tab.
 *
 * Manage the F1 2026 driver grid: team assignments, race numbers, active
 * status, photo URLs. Mirrors the RacesTab pattern — list on the left,
 * detail/edit panel on the right (or stacked on small screens).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Edit2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── team colours ────────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, string> = {
  McLaren: "#FF8000",
  Ferrari: "#E8002D",
  "Red Bull Racing": "#3671C6",
  Mercedes: "#27F4D2",
  Alpine: "#FF87BC",
  Aston: "#229971",
  "Aston Martin": "#229971",
  Williams: "#64C4FF",
  "Racing Bulls": "#6692FF",
  Haas: "#B6BABD",
  Sauber: "#52E252",
  Audi: "#52E252",
  Cadillac: "#C8C8C8",
};

function teamColor(team: string): string {
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (team.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#9CA3AF";
}

// ── types ───────────────────────────────────────────────────────────────────

interface Driver {
  id: string;
  name: string;
  team: string;
  number: number;
  country: string;
  code?: string | null;
  photo_url?: string | null;
  active: boolean;
  notes?: string | null;
  seeded?: boolean;
  updated_at?: string;
}

// ── empty state ─────────────────────────────────────────────────────────────

function EmptyDrivers({ onSeed }: { onSeed: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <Users className="h-12 w-12 text-pk-titane/40" />
      <p className="font-heading text-lg uppercase text-pk-titane">Aucun pilote en base</p>
      <p className="font-body text-sm text-gray-500">
        Initialisez depuis le catalogue statique F1 2026.
      </p>
      <Button onClick={onSeed} className="gap-2 bg-pk-red hover:bg-pk-red-hover text-white">
        <RefreshCw className="h-4 w-4" />
        Seed depuis F1 2026
      </Button>
    </div>
  );
}

// ── edit form ────────────────────────────────────────────────────────────────

interface EditFormProps {
  driver: Driver;
  onSave: (updates: Partial<Driver>) => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}

function EditForm({ driver, onSave, onDelete, saving, deleting }: EditFormProps) {
  const [name, setName] = useState(driver.name);
  const [team, setTeam] = useState(driver.team);
  const [number, setNumber] = useState(String(driver.number));
  const [code, setCode] = useState(driver.code ?? "");
  const [country, setCountry] = useState(driver.country ?? "");
  const [photoUrl, setPhotoUrl] = useState(driver.photo_url ?? "");
  const [active, setActive] = useState(driver.active);
  const [notes, setNotes] = useState(driver.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isDirty =
    name !== driver.name ||
    team !== driver.team ||
    String(number) !== String(driver.number) ||
    code !== (driver.code ?? "") ||
    country !== (driver.country ?? "") ||
    photoUrl !== (driver.photo_url ?? "") ||
    active !== driver.active ||
    notes !== (driver.notes ?? "");

  const handleSave = () => {
    const n = parseInt(number, 10);
    if (!name.trim() || !team.trim() || Number.isNaN(n)) {
      toast.error("Nom, écurie et numéro sont obligatoires.");
      return;
    }
    onSave({
      name: name.trim(),
      team: team.trim(),
      number: n,
      code: code.trim() || null,
      country: country.trim(),
      photo_url: photoUrl.trim() || null,
      active,
      notes: notes.trim() || null,
    });
  };

  const accent = teamColor(team);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center font-data text-sm font-bold text-pk-carbon"
          style={{ background: accent }}
        >
          {driver.number}
        </div>
        <div>
          <p className="font-heading text-base uppercase tracking-wide text-white">{driver.name}</p>
          <p className="font-body text-xs text-pk-titane" style={{ color: accent }}>
            {driver.team}
          </p>
        </div>
        <div className="ml-auto">
          {driver.active ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-pk-emerald/30 bg-pk-emerald/10 px-2 py-0.5 font-mono text-[0.5rem] uppercase text-pk-emerald">
              <CheckCircle2 className="h-2.5 w-2.5" /> Actif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[0.5rem] uppercase text-pk-titane">
              <XCircle className="h-2.5 w-2.5" /> Inactif
            </span>
          )}
        </div>
      </div>

      {/* Photo preview */}
      {(photoUrl || driver.photo_url) && (
        <img
          src={photoUrl || driver.photo_url || ""}
          alt={name}
          className="h-28 w-28 rounded-lg object-cover border border-white/10 mx-auto"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            Nom complet
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-white/10 bg-pk-surface text-white focus:border-pk-red"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            Écurie
          </label>
          <Input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="border-white/10 bg-pk-surface text-white focus:border-pk-red"
          />
        </div>

        <div>
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            Numéro
          </label>
          <Input
            type="number"
            min={0}
            max={99}
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            className="border-white/10 bg-pk-surface text-white focus:border-pk-red"
          />
        </div>

        <div>
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            Code (3 lettres)
          </label>
          <Input
            value={code}
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="border-white/10 bg-pk-surface text-white focus:border-pk-red font-mono uppercase"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            Pays (code ISO)
          </label>
          <Input
            value={country}
            maxLength={10}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="border-white/10 bg-pk-surface text-white focus:border-pk-red"
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            URL photo
          </label>
          <div className="flex gap-2">
            <Input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://media.formula1.com/..."
              className="border-white/10 bg-pk-surface text-white focus:border-pk-red text-xs"
            />
            {photoUrl && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center px-2 text-pk-titane hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block font-data text-[0.6rem] uppercase tracking-[0.12em] text-pk-titane">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-white/10 bg-pk-surface px-3 py-2 font-body text-xs text-white placeholder-pk-titane focus:border-pk-red focus:outline-none"
          />
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              active ? "bg-pk-red" : "bg-pk-anthracite"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                active ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="font-body text-xs text-pk-titane">
            {active ? "Pilote actif (visible dans le jeu)" : "Pilote inactif (masqué)"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4">
        <Button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex-1 gap-2 bg-pk-red hover:bg-pk-red-hover text-white disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Enregistrer
        </Button>

        {!confirmDelete ? (
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="text-pk-titane hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              className="text-pk-titane"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-1"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              Supprimer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function DriversTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── queries ──
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "drivers"],
    queryFn: () => adminApi.drivers.list(),
  });

  const selectedDriver = useMemo(
    () => drivers.find((d: Driver) => d.id === selectedId) ?? null,
    [drivers, selectedId],
  );

  // ── mutations ──
  const seedMut = useMutation({
    mutationFn: () => adminApi.drivers.seed(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-bo", "drivers"] });
      toast.success(`${data.seeded} pilotes seedés, ${data.skipped} ignorés.`);
    },
    onError: () => toast.error("Erreur lors du seed."),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Driver> }) =>
      adminApi.drivers.update(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bo", "drivers"] });
      toast.success("Pilote mis à jour.");
    },
    onError: () => toast.error("Erreur lors de la mise à jour."),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.drivers.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bo", "drivers"] });
      setSelectedId(null);
      toast.success("Pilote supprimé.");
    },
    onError: () => toast.error("Erreur lors de la suppression."),
  });

  // ── derived data ──
  const teams = useMemo(
    () => ["all", ...Array.from(new Set(drivers.map((d: Driver) => d.team))).sort()],
    [drivers],
  );

  const filtered = useMemo(() => {
    let list = drivers as Driver[];
    if (teamFilter !== "all") list = list.filter((d) => d.team === teamFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.team.toLowerCase().includes(q) ||
          (d.code ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [drivers, teamFilter, search]);

  // ── group by team ──
  const grouped = useMemo(() => {
    const map = new Map<string, Driver[]>();
    for (const d of filtered) {
      if (!map.has(d.team)) map.set(d.team, []);
      map.get(d.team)!.push(d);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-pk-red" />
            <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-red">
              Pilotes & Écuries
            </p>
          </div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">
            Gestion des pilotes
          </h2>
          <p className="mt-1 font-body text-sm text-gray-500">
            {drivers.length} pilote{drivers.length !== 1 ? "s" : ""} en base
            {drivers.length > 0 ? ` · ${teams.length - 1} écuries` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending}
            className="gap-2 border-white/10 text-pk-titane hover:text-white"
          >
            {seedMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {drivers.length === 0 ? "Seed F1 2026" : "Re-seed"}
          </Button>
        </div>
      </div>

      {/* ── Empty state ── */}
      {!isLoading && drivers.length === 0 && <EmptyDrivers onSeed={() => seedMut.mutate()} />}

      {/* ── Content ── */}
      {drivers.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* List */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pk-titane" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, code, écurie…"
                  className="pl-8 border-white/10 bg-pk-surface text-white focus:border-pk-red text-sm"
                />
              </div>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="rounded-md border border-white/10 bg-pk-surface px-3 py-2 font-body text-sm text-white focus:border-pk-red focus:outline-none"
              >
                {(teams as string[]).map((t) => (
                  <option key={t} value={t}>
                    {t === "all" ? "Toutes les écuries" : t}
                  </option>
                ))}
              </select>
            </div>

            {/* Groups */}
            {grouped.map(([teamName, teamDrivers]) => (
              <div key={teamName} className="overflow-hidden rounded-md border border-white/[0.08]">
                {/* Team header */}
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ borderLeft: `3px solid ${teamColor(teamName)}` }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: teamColor(teamName) }}
                  />
                  <p className="font-data text-[0.65rem] uppercase tracking-[0.14em] text-white">
                    {teamName}
                  </p>
                  <span className="ml-auto font-mono text-[0.55rem] text-pk-titane">
                    {teamDrivers.length} pilote{teamDrivers.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Driver rows */}
                {teamDrivers.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                    className={`flex w-full items-center gap-3 border-t border-white/[0.05] px-3 py-2.5 text-left transition-colors ${
                      d.id === selectedId ? "bg-pk-red/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Number badge */}
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-data text-xs font-bold text-pk-carbon"
                      style={{ background: teamColor(d.team) }}
                    >
                      {d.number}
                    </span>

                    {/* Name + code */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`truncate font-heading text-sm uppercase ${d.id === selectedId ? "text-white" : "text-pk-piste"}`}
                      >
                        {d.name}
                      </p>
                      {d.code && (
                        <p className="font-mono text-[0.5rem] tracking-widest text-pk-titane">
                          {d.code}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    {!d.active && (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.45rem] uppercase text-pk-titane">
                        Inactif
                      </span>
                    )}

                    {d.id === selectedId && <Edit2 className="h-3.5 w-3.5 shrink-0 text-pk-red" />}
                  </button>
                ))}
              </div>
            ))}

            {filtered.length === 0 && drivers.length > 0 && (
              <p className="py-8 text-center font-body text-sm text-pk-titane">
                Aucun résultat pour « {search} »
              </p>
            )}
          </div>

          {/* Edit panel */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            {selectedDriver ? (
              <div className="rounded-md border border-white/[0.08] bg-pk-surface p-5">
                <EditForm
                  key={selectedDriver.id}
                  driver={selectedDriver}
                  saving={updateMut.isPending}
                  deleting={deleteMut.isPending}
                  onSave={(updates) => updateMut.mutate({ id: selectedDriver.id, updates })}
                  onDelete={() => deleteMut.mutate(selectedDriver.id)}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-white/[0.08] py-16 text-center">
                <UserPlus className="h-8 w-8 text-pk-titane/40" />
                <p className="font-body text-sm text-pk-titane">
                  Sélectionne un pilote pour l'éditer
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-pk-red" />
        </div>
      )}
    </div>
  );
}
