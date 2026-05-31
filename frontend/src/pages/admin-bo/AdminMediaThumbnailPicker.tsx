import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Image, Link2, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "./adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MediaAsset {
  id: string;
  original_name: string;
  filename: string;
  folder?: string;
  entity_type?: string;
  size?: number;
}

interface AdminMediaThumbnailPickerProps {
  value?: string;
  onValueChange: (value: string) => void;
  entityType: string;
  entityId?: string;
  folder: string;
  label?: string;
  testId?: string;
}

export function AdminMediaThumbnailPicker({
  value,
  onValueChange,
  entityType,
  entityId,
  folder,
  label = "Vignette",
  testId = "admin-media-thumbnail-picker",
}: AdminMediaThumbnailPickerProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["admin-bo", "media", "picker", entityType, folder],
    queryFn: () => adminApi.media.list({ entityType, folder }),
    staleTime: 60_000,
  });

  const mediaItems = Array.isArray(media) ? (media as MediaAsset[]) : [];

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await adminApi.media.upload(file, entityType, entityId, folder);
      const nextUrl = adminApi.media.fileUrl(uploaded.id);
      onValueChange(nextUrl);
      await queryClient.invalidateQueries({ queryKey: ["admin-bo", "media"] });
      toast.success("Image importée dans la médiathèque");
    } catch {
      toast.error("Impossible d'importer l'image");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  return (
    <section className="rounded-md border border-white/10 bg-black/30 p-3" data-testid={testId}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-data text-[10px] uppercase tracking-[0.15em] text-gray-500">{label}</p>
          <p className="mt-1 font-body text-xs text-gray-400">Source image</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 font-data text-[10px] uppercase text-gray-400">
          <FolderOpen className="h-3 w-3" />
          {folder}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[112px_minmax(0,1fr)]">
        <div className="relative h-28 overflow-hidden rounded-md border border-white/10 bg-gray-950">
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onValueChange("")}
                className="absolute right-2 top-2 rounded-sm bg-black/70 p-1 text-gray-300 hover:text-white"
                data-testid={`${testId}-clear`}
                title="Retirer la vignette"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Image className="h-8 w-8 text-gray-600" />
            </div>
          )}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-28 flex-col justify-center rounded-md border border-dashed p-3 transition-colors ${
            isDragging ? "border-pk-red bg-pk-red/10" : "border-white/15 bg-white/[0.02]"
          }`}
          data-testid={`${testId}-dropzone`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            data-testid={`${testId}-file-input`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="btn-racing text-xs"
              disabled={isUploading}
              onClick={() => fileRef.current?.click()}
              data-testid={`${testId}-upload`}
            >
              {isUploading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-1 h-4 w-4" />
              )}
              Déposer / choisir
            </Button>
            <span className="font-body text-xs text-gray-500">PNG, JPG, WebP, SVG ou GIF.</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-gray-500" />
            <Input
              value={value || ""}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder="URL image"
              className="h-9 border-gray-700 bg-gray-900 text-white"
              data-testid={`${testId}-url`}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-data text-[10px] uppercase tracking-[0.15em] text-gray-500">
            Médiathèque
          </p>
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
        </div>
        {mediaItems.length === 0 ? (
          <p className="rounded-sm border border-white/10 bg-white/[0.02] px-3 py-2 font-body text-xs text-gray-500">
            Aucun média dans ce dossier.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {mediaItems.slice(0, 8).map((mediaItem) => {
              const mediaUrl = adminApi.media.fileUrl(mediaItem.id);
              return (
                <button
                  key={mediaItem.id}
                  type="button"
                  onClick={() => onValueChange(mediaUrl)}
                  className={`group relative aspect-square overflow-hidden rounded-sm border bg-gray-950 ${
                    value === mediaUrl
                      ? "border-pk-red shadow-[0_0_14px_rgba(225,6,0,0.3)]"
                      : "border-white/10 hover:border-white/25"
                  }`}
                  title={mediaItem.original_name || mediaItem.filename}
                  data-testid={`${testId}-library-${mediaItem.id}`}
                >
                  <img
                    src={mediaUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
