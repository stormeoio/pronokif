/**
 * Admin Races (events) CRUD tab.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, Flag, Zap } from "lucide-react";
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
  is_sprint: boolean;
  is_past: boolean;
  has_results: boolean;
  round_number?: number;
  season: number;
  thumbnail_url?: string;
}

export default function RacesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Race | null>(null);
  const [form, setForm] = useState({
    name: "",
    circuit: "",
    country: "",
    date: "",
    is_sprint: false,
    round_number: 1,
    season: 2025,
  });

  const { data: races = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "races"],
    queryFn: () => adminApi.races.list(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await adminApi.races.update(editing.id, form);
        toast.success("Course mise à jour");
      } else {
        await adminApi.races.create(form);
        toast.success("Course créée");
      }
      setShowForm(false);
      setEditing(null);
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
      date: race.date,
      is_sprint: race.is_sprint,
      round_number: race.round_number || 1,
      season: race.season,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer la course "${name}" ?`)) return;
    try {
      await adminApi.races.delete(id);
      toast.success("Course supprimée");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "races"] });
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Courses</h2>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
          }}
          className="btn-racing text-xs"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nouvelle course
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-arcade p-4 mb-4 border border-orange-500/30 space-y-3"
        >
          <h3 className="font-heading text-sm text-orange-400 uppercase">
            {editing ? "Modifier la course" : "Nouvelle course"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom (Grand Prix de...)"
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
              type="number"
              value={form.round_number}
              onChange={(e) => setForm({ ...form, round_number: parseInt(e.target.value) })}
              placeholder="Round"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Input
              type="number"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: parseInt(e.target.value) })}
              placeholder="Saison"
              className="bg-gray-900 border-gray-700 text-white"
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
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="btn-racing text-xs">
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="text-gray-400 text-xs"
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {races.map((race: Race) => (
            <div key={race.id} className="card-arcade p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${race.is_past ? "bg-green-500/20" : "bg-gray-800"}`}
                >
                  <Flag
                    className={`w-4 h-4 ${race.is_past ? "text-green-400" : "text-gray-500"}`}
                  />
                </div>
                <div>
                  <p className="font-body text-white text-sm flex items-center gap-2">
                    {race.name}
                    {race.is_sprint && <Zap className="w-3 h-3 text-purple-400" />}
                    {race.has_results && (
                      <span className="text-[10px] text-green-400 bg-green-500/20 px-1 rounded">
                        Résultats
                      </span>
                    )}
                  </p>
                  <p className="font-body text-xs text-gray-500">
                    {race.circuit && `${race.circuit} • `}
                    {new Date(race.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(race)}
                  className="p-2 text-gray-400 hover:text-cyan-400 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(race.id, race.name)}
                  className="p-2 text-gray-400 hover:text-red-400 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {races.length === 0 && (
            <div className="card-arcade p-8 text-center">
              <Flag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-body text-gray-500">Aucune course. Ajoutez-en une !</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
