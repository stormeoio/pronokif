/**
 * Admin Media management tab — upload and manage reusable images/thumbnails.
 */
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clipboard,
  FolderOpen,
  FolderPlus,
  Image,
  Images,
  Loader2,
  MoveRight,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Media {
  id: string;
  filename: string;
  original_name: string;
  content_type: string;
  size: number;
  entity_type: string;
  entity_id: string;
  folder?: string;
  uploaded_by: string;
  created_at: string;
}

interface MediaFolder {
  folder: string;
  count: number;
  size: number;
}

const entityOptions = [
  { value: "general", label: "Général" },
  { value: "championship", label: "Championnat" },
  { value: "race", label: "Course" },
  { value: "driver", label: "Pilote" },
  { value: "team", label: "Équipe" },
];

export default function MediaTab() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [entityType, setEntityType] = useState("general");
  const [uploadFolder, setUploadFolder] = useState("general");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [folderEdits, setFolderEdits] = useState<Record<string, string>>({});
  const [movingMediaId, setMovingMediaId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(false);

  const folderFilter = selectedFolder === "all" ? undefined : selectedFolder;

  const { data: foldersData = [] } = useQuery({
    queryKey: ["admin-bo", "media", "folders"],
    queryFn: () => adminApi.media.folders(),
  });

  const { data: mediaData = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "media", folderFilter ?? "all"],
    queryFn: () => adminApi.media.list({ folder: folderFilter }),
  });

  const folders = Array.isArray(foldersData) ? (foldersData as MediaFolder[]) : [];
  const mediaList = Array.isArray(mediaData) ? (mediaData as Media[]) : [];

  useEffect(() => {
    setRenameFolderValue(selectedFolder === "all" ? "" : selectedFolder);
  }, [selectedFolder]);

  const uploadFiles = async (files: FileList | File[]) => {
    const filesToUpload = Array.from(files);
    if (filesToUpload.length === 0) return;

    const activeUploadFolder = uploadFolder.trim() || "general";
    setUploading(true);
    try {
      for (const file of filesToUpload) {
        await adminApi.media.upload(file, entityType, undefined, activeUploadFolder);
      }
      toast.success(`${filesToUpload.length} fichier(s) ajouté(s) à la médiathèque`);
      await queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
      if (selectedFolder !== "all" && selectedFolder !== activeUploadFolder) {
        setSelectedFolder(activeUploadFolder);
      }
    } catch {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
      setIsDragging(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) void uploadFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) void uploadFiles(event.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce fichier ?")) return;
    try {
      await adminApi.media.delete(id);
      toast.success("Fichier supprimé");
      await queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
    } catch {
      toast.error("Erreur");
    }
  };

  const handleMoveMedia = async (media: Media) => {
    const currentFolder = media.folder || "general";
    const nextFolder = (folderEdits[media.id] || currentFolder).trim() || "general";
    if (nextFolder === currentFolder) {
      toast.info("Dossier inchangé");
      return;
    }
    setMovingMediaId(media.id);
    try {
      await adminApi.media.update(media.id, { folder: nextFolder });
      toast.success("Média déplacé");
      await queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
      setFolderEdits((current) => {
        const next = { ...current };
        delete next[media.id];
        return next;
      });
    } catch {
      toast.error("Impossible de déplacer le média");
    } finally {
      setMovingMediaId(null);
    }
  };

  const handleRenameFolder = async () => {
    if (selectedFolder === "all") return;
    const nextFolder = renameFolderValue.trim() || "general";
    if (nextFolder === selectedFolder) {
      toast.info("Dossier inchangé");
      return;
    }
    setRenamingFolder(true);
    try {
      const response = await adminApi.media.renameFolder({
        from_folder: selectedFolder,
        to_folder: nextFolder,
      });
      toast.success(`${response.modified ?? 0} média(s) déplacé(s)`);
      setSelectedFolder(nextFolder);
      setUploadFolder(nextFolder);
      await queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
    } catch {
      toast.error("Impossible de renommer le dossier");
    } finally {
      setRenamingFolder(false);
    }
  };

  const handleCopyUrl = async (media: Media) => {
    const url = adminApi.media.fileUrl(media.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiée");
    } catch {
      toast.error("Impossible de copier l'URL");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const folderCount = folders.reduce((sum, folder) => sum + folder.count, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Médias</h2>
          <p className="mt-1 font-body text-sm text-gray-500">
            {folderCount} fichier(s) organisés dans {Math.max(folders.length, 1)} dossier(s)
          </p>
        </div>
        <span className="font-data text-sm text-gray-500">{mediaList.length} affiché(s)</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-md border border-white/10 bg-black/30 p-3">
          <div className="mb-3 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-orange-400" />
            <p className="font-data text-[10px] uppercase tracking-[0.15em] text-gray-500">
              Dossiers
            </p>
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedFolder("all")}
              className={`flex w-full items-center justify-between rounded-sm px-2 py-2 text-left font-body text-xs transition-colors ${
                selectedFolder === "all"
                  ? "bg-pk-red/15 text-white"
                  : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
              }`}
              data-testid="media-folder-all"
            >
              <span>Tous</span>
              <span className="font-data text-[10px] text-gray-500">{folderCount}</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder.folder}
                type="button"
                onClick={() => setSelectedFolder(folder.folder)}
                className={`flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left transition-colors ${
                  selectedFolder === folder.folder
                    ? "bg-pk-red/15 text-white"
                    : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
                }`}
                data-testid={`media-folder-${folder.folder}`}
              >
                <span className="truncate font-body text-xs">{folder.folder}</span>
                <span className="shrink-0 font-data text-[10px] text-gray-500">{folder.count}</span>
              </button>
            ))}
          </div>
          {selectedFolder !== "all" && (
            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.02] p-2">
              <p className="mb-2 font-data text-[10px] uppercase tracking-[0.15em] text-gray-500">
                Renommer
              </p>
              <Input
                value={renameFolderValue}
                onChange={(event) => setRenameFolderValue(event.target.value)}
                className="h-8 border-gray-700 bg-gray-900 text-xs text-white"
                data-testid="media-rename-folder-input"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRenameFolder}
                disabled={renamingFolder}
                className="mt-2 h-8 w-full justify-center text-xs text-orange-300 hover:text-orange-200"
                data-testid="media-rename-folder-submit"
              >
                {renamingFolder ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                Renommer
              </Button>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`mb-6 rounded-md border border-dashed p-4 transition-colors ${
              isDragging ? "border-pk-red bg-pk-red/10" : "border-white/15 bg-black/30"
            }`}
            data-testid="media-upload-dropzone"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Images className="h-5 w-5 text-orange-400" />
                  <p className="font-heading text-sm uppercase text-white">Ajouter des images</p>
                </div>
                <p className="mt-1 font-body text-xs text-gray-500">
                  Images stockées et réutilisables dans les fiches admin.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="h-9 rounded-sm border border-gray-700 bg-gray-900 px-3 text-xs text-gray-300"
                  aria-label="Type d'entité"
                >
                  {entityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 rounded-sm border border-gray-700 bg-gray-900 px-2">
                  <FolderPlus className="h-4 w-4 text-gray-500" />
                  <Input
                    value={uploadFolder}
                    onChange={(event) => setUploadFolder(event.target.value)}
                    placeholder="Dossier"
                    className="h-8 w-40 border-0 bg-transparent px-0 text-xs text-white focus-visible:ring-0"
                    list="media-folder-options"
                    data-testid="media-upload-folder"
                  />
                  <datalist id="media-folder-options">
                    {folders.map((folder) => (
                      <option key={folder.folder} value={folder.folder} />
                    ))}
                  </datalist>
                </div>
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  size="sm"
                  className="btn-racing text-xs"
                  type="button"
                  data-testid="media-upload-button"
                >
                  {uploading ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-1 h-4 w-4" />
                  )}
                  Importer
                </Button>
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

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : mediaList.length === 0 ? (
            <div className="card-arcade p-8 text-center">
              <Image className="mx-auto mb-3 h-12 w-12 text-gray-600" />
              <p className="font-body text-gray-500">Aucun fichier dans ce dossier.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {mediaList.map((media) => (
                <div key={media.id} className="card-arcade group relative overflow-hidden">
                  <div className="aspect-square bg-gray-900">
                    <img
                      src={adminApi.media.fileUrl(media.id)}
                      alt={media.original_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate font-body text-xs text-white">{media.original_name}</p>
                    <p className="mt-1 truncate font-body text-[10px] text-gray-500">
                      {formatSize(media.size)} • {media.entity_type}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <Input
                        value={folderEdits[media.id] ?? media.folder ?? "general"}
                        onChange={(event) =>
                          setFolderEdits((current) => ({
                            ...current,
                            [media.id]: event.target.value,
                          }))
                        }
                        list="media-folder-options"
                        className="h-8 min-w-0 border-gray-700 bg-gray-900 px-2 font-data text-[10px] uppercase text-orange-300/80"
                        data-testid={`media-folder-edit-${media.id}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleMoveMedia(media)}
                        disabled={movingMediaId === media.id}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-white/[0.03] text-gray-400 hover:border-orange-400/30 hover:text-orange-300 disabled:opacity-50"
                        data-testid={`media-folder-move-${media.id}`}
                        title="Déplacer"
                      >
                        {movingMediaId === media.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MoveRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(media)}
                    className="absolute left-2 top-2 rounded-sm bg-black/70 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    data-testid={`copy-media-url-${media.id}`}
                    title="Copier l'URL"
                  >
                    <Clipboard className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(media.id)}
                    className="absolute right-2 top-2 rounded-sm bg-red-500/80 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    data-testid={`delete-media-${media.id}`}
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
