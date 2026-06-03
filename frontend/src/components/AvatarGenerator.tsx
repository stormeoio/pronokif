/**
 * AvatarGenerator — F1 pilot avatar generator.
 * Lets the user pick a team skin, upload or take a selfie,
 * position their face in the visor, and export a composite avatar.
 *
 * Broadcast Premium: pk-surface cards, pk-red accents, dark-only.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, ChevronLeft, Check, ZoomIn, ZoomOut, Move } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { AVATAR_TEAMS, skinThumbUrl, skinFullUrl, type AvatarSkin } from "@/data/avatarSkins";

// ------------------------------------------------------------------ types ---

interface Props {
  onGenerated: (file: File) => Promise<void>;
  onCancel: () => void;
}

type Step = "pick-skin" | "add-photo" | "compose";

// Canvas output size (matches upload limit ~400KB as JPEG)
const CANVAS_SIZE = 600;

// ---------------------------------------------------------- AvatarGenerator ---

export function AvatarGenerator({ onGenerated, onCancel }: Props) {
  const [step, setStep] = useState<Step>("pick-skin");
  const [selectedSkin, setSelectedSkin] = useState<AvatarSkin | null>(null);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Photo transform (position & scale relative to canvas)
  const [photoScale, setPhotoScale] = useState(1.2);
  const [photoX, setPhotoX] = useState(0);
  const [photoY, setPhotoY] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Drag state
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  // -------------------------------------------------------- skin selection ---

  const filteredTeams = teamFilter ? AVATAR_TEAMS.filter((t) => t.id === teamFilter) : AVATAR_TEAMS;

  const handleSelectSkin = (skin: AvatarSkin) => {
    haptic("light");
    setSelectedSkin(skin);
    // Preload the full-res mask
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = skinFullUrl(skin.file);
    img.onload = () => {
      maskImgRef.current = img;
    };
    setStep("add-photo");
  };

  // ----------------------------------------------------------- photo input ---

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoSrc(reader.result as string);
      setStep("compose");
    };
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------- selfie camera ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 800 }, height: { ideal: 800 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      alert("Impossible d'acceder a la camera");
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }, []);

  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  }, [showCamera]);

  // Cleanup camera on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    // Mirror for selfie
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    setPhotoSrc(c.toDataURL("image/jpeg", 0.9));
    stopCamera();
    setStep("compose");
  };

  // ------------------------------------------------ photo load for compose ---

  useEffect(() => {
    if (step !== "compose" || !photoSrc) return;
    const img = new Image();
    img.onload = () => {
      photoImgRef.current = img;
      // Reset position
      setPhotoScale(1.2);
      setPhotoX(0);
      setPhotoY(-30);
      renderCanvas();
    };
    img.src = photoSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, photoSrc]);

  // --------------------------------------------------------- canvas render ---

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoImgRef.current;
    const mask = maskImgRef.current;
    if (!canvas || !photo || !mask) return;

    const ctx = canvas.getContext("2d")!;
    const S = CANVAS_SIZE;
    canvas.width = S;
    canvas.height = S;

    ctx.clearRect(0, 0, S, S);

    // Draw photo (behind mask) — centered and scaled
    const aspect = photo.width / photo.height;
    let drawW: number, drawH: number;
    if (aspect > 1) {
      drawH = S * photoScale;
      drawW = drawH * aspect;
    } else {
      drawW = S * photoScale;
      drawH = drawW / aspect;
    }
    const dx = (S - drawW) / 2 + photoX;
    const dy = (S - drawH) / 2 + photoY;
    ctx.drawImage(photo, dx, dy, drawW, drawH);

    // Draw mask on top (transparent visor lets photo show)
    ctx.drawImage(mask, 0, 0, S, S);
  }, [photoScale, photoX, photoY]);

  useEffect(() => {
    if (step === "compose") renderCanvas();
  }, [step, photoScale, photoX, photoY, renderCanvas]);

  // ---------------------------------------------------------- drag & scale ---

  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: photoX,
      origY: photoY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    // Scale movement to canvas coordinates
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_SIZE / rect.width;
    setPhotoX(dragRef.current.origX + dx * scale);
    setPhotoY(dragRef.current.origY + dy * scale);
  };

  const handlePointerUp = () => {
    dragRef.current.dragging = false;
  };

  const zoomIn = () => {
    haptic("light");
    setPhotoScale((s) => Math.min(s + 0.15, 3));
  };

  const zoomOut = () => {
    haptic("light");
    setPhotoScale((s) => Math.max(s - 0.15, 0.5));
  };

  // -------------------------------------------------------------- export ---

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (!blob) throw new Error("Export failed");
      const file = new File([blob], "avatar-pilote.jpg", { type: "image/jpeg" });
      await onGenerated(file);
      haptic("success");
    } catch {
      haptic("error");
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------- render ---

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (step === "compose") {
              setStep("add-photo");
              setPhotoSrc(null);
            } else if (step === "add-photo") {
              setStep("pick-skin");
              setSelectedSkin(null);
            } else {
              onCancel();
            }
          }}
          className="w-8 h-8 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-display text-sm text-pk-piste">
          {step === "pick-skin" && "Choisis ton skin"}
          {step === "add-photo" && "Ajoute ta photo"}
          {step === "compose" && "Positionne ton visage"}
        </h3>
      </div>

      {/* ── Step 1: Pick skin ──────────────────────────────── */}
      {step === "pick-skin" && (
        <>
          {/* Team filter pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => {
                haptic("light");
                setTeamFilter(null);
              }}
              className={`px-3 py-1.5 rounded-md font-data text-[0.625rem] uppercase tracking-wider whitespace-nowrap transition-all ${
                !teamFilter
                  ? "bg-pk-red text-white"
                  : "bg-white/[0.04] text-pk-titane hover:bg-white/[0.08]"
              }`}
            >
              Toutes
            </button>
            {AVATAR_TEAMS.map((team) => (
              <button
                key={team.id}
                onClick={() => {
                  haptic("light");
                  setTeamFilter(team.id);
                }}
                className={`px-3 py-1.5 rounded-md font-data text-[0.625rem] uppercase tracking-wider whitespace-nowrap transition-all ${
                  teamFilter === team.id
                    ? "text-white"
                    : "bg-white/[0.04] text-pk-titane hover:bg-white/[0.08]"
                }`}
                style={teamFilter === team.id ? { backgroundColor: team.color } : undefined}
              >
                {team.name}
              </button>
            ))}
          </div>

          {/* Skins grid */}
          <div className="grid grid-cols-3 gap-2">
            {filteredTeams.flatMap((team) =>
              team.skins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => handleSelectSkin(skin)}
                  className="group relative rounded-lg overflow-hidden border-2 border-white/[0.08] hover:border-white/[0.2] transition-all bg-pk-surface aspect-square"
                >
                  <img
                    src={skinThumbUrl(skin.file)}
                    alt={skin.team}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                    <p className="font-data text-[0.5rem] text-white/80 uppercase tracking-wider">
                      {skin.team}
                    </p>
                  </div>
                </button>
              )),
            )}
          </div>
        </>
      )}

      {/* ── Step 2: Add photo ──────────────────────────────── */}
      {step === "add-photo" && (
        <div className="space-y-3">
          {/* Selected skin preview */}
          {selectedSkin && (
            <div className="flex justify-center">
              <div className="w-40 h-40 rounded-lg overflow-hidden border-2 border-white/[0.12]">
                <img
                  src={skinThumbUrl(selectedSkin.file)}
                  alt={selectedSkin.team}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <p className="text-center text-sm text-pk-titane">
            Ajoute une photo de face pour la placer dans la visiere
          </p>

          {/* Camera / selfie modal */}
          {showCamera ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-square max-w-xs mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={capturePhoto}
                  className="px-6 py-2.5 bg-pk-red text-white rounded-lg font-display text-sm hover:bg-pk-red/90 transition-colors"
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Capturer
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2.5 bg-white/[0.06] text-pk-titane rounded-lg font-display text-sm hover:bg-white/[0.1] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleFileSelect}
                className="w-full py-3 bg-pk-red text-white rounded-lg font-display text-sm hover:bg-pk-red/90 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Uploader une photo
              </button>
              <button
                onClick={startCamera}
                className="w-full py-3 bg-white/[0.06] text-pk-piste rounded-lg font-display text-sm hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Prendre un selfie
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* ── Step 3: Compose ────────────────────────────────── */}
      {step === "compose" && (
        <div className="space-y-3">
          <p className="text-center font-data text-[0.625rem] text-pk-titane/60 uppercase tracking-wider flex items-center justify-center gap-1">
            <Move className="w-3 h-3" />
            Glisse pour positionner ta photo
          </p>

          {/* Canvas preview */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="rounded-lg border-2 border-white/[0.12] cursor-grab active:cursor-grabbing touch-none"
              style={{ width: "min(100%, 300px)", height: "auto", aspectRatio: "1/1" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={zoomOut}
              className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-pk-titane hover:bg-white/[0.1] transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-24 text-center">
              <span className="font-data text-xs text-pk-titane">
                {Math.round(photoScale * 100)}%
              </span>
            </div>
            <button
              onClick={zoomIn}
              className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-pk-titane hover:bg-white/[0.1] transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-pk-red text-white rounded-lg font-display text-sm hover:bg-pk-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              "Sauvegarde..."
            ) : (
              <>
                <Check className="w-4 h-4" />
                Valider mon avatar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default AvatarGenerator;
