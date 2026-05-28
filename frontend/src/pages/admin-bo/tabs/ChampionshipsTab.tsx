/**
 * Admin Championships CRUD tab.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Championship {
  id: string;
  name: string;
  season: number;
  description?: string;
  thumbnail_url?: string;
  is_active: boolean;
  created_at: string;
}

export default function ChampionshipsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Championship | null>(null);
  const [form, setForm] = useState({ name: "", season: 2025, description: "", is_active: true });

  const { data: championships = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "championships"],
    queryFn: () => adminApi.championships.list(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await adminApi.championships.update(editing.id, form);
        toast.success("Championnat mis à jour");
      } else {
        await adminApi.championships.create(form);
        toast.success("Championnat créé");
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: "", season: 2025, description: "", is_active: true });
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "championships"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleEdit = (champ: Championship) => {
    setEditing(champ);
    setForm({
      name: champ.name,
      season: champ.season,
      description: champ.description || "",
      is_active: champ.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le championnat « ${name} » ?`)) return;
    try {
      await adminApi.championships.delete(id);
      toast.success("Championnat supprimé");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "championships"] });
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Championnats</h2>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditing(null);
            setForm({ name: "", season: 2025, description: "", is_active: true });
          }}
          className="btn-racing text-xs"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nouveau
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card-arcade p-4 mb-4 border border-orange-500/30 space-y-3"
        >
          <h3 className="font-heading text-sm text-orange-400 uppercase">
            {editing ? "Modifier le championnat" : "Nouveau championnat"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom (ex: Formula 1 2025)"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
            <Input
              type="number"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: parseInt(e.target.value) })}
              placeholder="Saison"
              className="bg-gray-900 border-gray-700 text-white"
              required
            />
          </div>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optionnel)"
            className="bg-gray-900 border-gray-700 text-white"
          />
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-700"
            />
            Actif
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

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : championships.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-body text-gray-500">Aucun championnat. Créez-en un !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {championships.map((champ: Championship) => (
            <div key={champ.id} className="card-arcade p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {champ.thumbnail_url ? (
                  <img
                    src={champ.thumbnail_url}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-purple-400" />
                  </div>
                )}
                <div>
                  <p className="font-body text-white text-sm">{champ.name}</p>
                  <p className="font-body text-xs text-gray-500">
                    Saison {champ.season}
                    {!champ.is_active && <span className="ml-2 text-red-400">(inactif)</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(champ)}
                  className="p-2 text-gray-400 hover:text-cyan-400 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(champ.id, champ.name)}
                  className="p-2 text-gray-400 hover:text-red-400 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
