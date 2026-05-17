/**
 * Admin Media management tab — upload and manage images/thumbnails.
 */
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Image, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";

interface Media {
  id: string;
  filename: string;
  original_name: string;
  content_type: string;
  size: number;
  entity_type: string;
  entity_id: string;
  uploaded_by: string;
  created_at: string;
}

export default function MediaTab() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [entityType, setEntityType] = useState("general");

  const { data: mediaList = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "media"],
    queryFn: () => adminApi.media.list(),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await adminApi.media.upload(file, entityType);
      }
      toast.success(`${files.length} fichier(s) envoyé(s)`);
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce fichier ?")) return;
    try {
      await adminApi.media.delete(id);
      toast.success("Fichier supprimé");
      queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight">Médias</h2>
        <span className="font-data text-sm text-gray-500">{mediaList.length} fichiers</span>
      </div>

      {/* Upload area */}
      <div className="card-arcade p-4 mb-6 border border-dashed border-gray-600 hover:border-orange-500/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="font-body text-sm text-gray-300 mb-2">
              Envoyez des images pour vos championnats, courses et événements
            </p>
            <div className="flex items-center gap-3">
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-1.5"
              >
                <option value="general">Général</option>
                <option value="championship">Championnat</option>
                <option value="race">Course</option>
                <option value="driver">Pilote</option>
                <option value="team">Écurie</option>
              </select>
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="btn-racing text-xs"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Choisir des fichiers
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Media grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : mediaList.length === 0 ? (
        <div className="card-arcade p-8 text-center">
          <Image className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="font-body text-gray-500">Aucun fichier. Commencez par en ajouter !</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaList.map((media: Media) => (
            <div key={media.id} className="card-arcade overflow-hidden group relative">
              <div className="aspect-square bg-gray-900 flex items-center justify-center">
                <img
                  src={adminApi.media.fileUrl(media.id)}
                  alt={media.original_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <p className="font-body text-xs text-white truncate">{media.original_name}</p>
                <p className="font-body text-[10px] text-gray-500">
                  {formatSize(media.size)} • {media.entity_type}
                </p>
              </div>
              {/* Delete overlay */}
              <button
                onClick={() => handleDelete(media.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
