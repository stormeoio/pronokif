/**
 * AvatarGenerator — F1 pilot avatar generator.
 *
 * Flow:
 *  1. Photo      — upload or selfie (first).
 *  2. Compose    — the helmet "filter" is revealed (Snapchat-style) over the
 *                  photo; the face is auto-placed in the helmet's visor opening
 *                  (MediaPipe face detection, heuristic fallback). The user can
 *                  fine-tune (drag + zoom), cycle helmets with side arrows, or
 *                  pick one directly from the model library.
 *  3. Background — color / gradient / F1 tarmac.
 *  Then: "Appliquer à mon profil" (save as avatar) and/or "Télécharger" (PNG).
 *
 * The photo is CLIPPED to the helmet's transparent visor opening (the enclosed
 * transparent region, found by flood-filling the mask alpha from the borders)
 * so it never bleeds outside the helmet.
 *
 * Broadcast Premium: pk-surface cards, pk-red accents, dark-only.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  Camera,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  ZoomIn,
  ZoomOut,
  Move,
  AlertCircle,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import {
  AVATAR_TEAMS,
  ALL_SKINS,
  skinThumbUrl,
  skinFullUrl,
  type AvatarSkin,
} from "@/data/avatarSkins";
import { detectFace, type FaceBox } from "@/lib/faceDetect";

// ------------------------------------------------------------------ types ---

interface Props {
  onGenerated: (file: File) => Promise<void>;
  onCancel: () => void;
}

type Step = "photo" | "compose" | "background";

type BgChoice =
  | { kind: "scene"; id: SceneId }
  | { kind: "color"; value: string }
  | { kind: "gradient"; value: [string, string] };

interface OpeningBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

const CANVAS_SIZE = 600;

// ------------------------------------------------------------ bg presets ---

const BG_COLORS: string[] = ["#0B0D12", "#E10600", "#1E3A6E", "#0E7C5A", "#C9A227", "#5F6673"];
const BG_GRADIENTS: [string, string][] = [
  ["#E10600", "#5A0200"],
  ["#3671C6", "#0B1A33"],
  ["#10B981", "#053B2C"],
  ["#F59E0B", "#5E2D00"],
  ["#6D28D9", "#1E1036"],
  ["#2A2D34", "#0B0D12"],
];
const DEFAULT_BG: BgChoice = { kind: "scene", id: "tarmac" };

function bgKey(bg: BgChoice): string {
  if (bg.kind === "scene") return `scene:${bg.id}`;
  if (bg.kind === "color") return `c:${bg.value}`;
  return `g:${bg.value[0]}-${bg.value[1]}`;
}

// ----------------------------------------------------- canvas mask helpers ---

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Build the helmet's visor-opening mask (opaque white inside the enclosed
 * transparent opening) plus the opening's bounding box (canvas px).
 */
function buildVisor(
  mask: HTMLImageElement,
  S: number,
): { canvas: HTMLCanvasElement; box: OpeningBox } {
  const off = document.createElement("canvas");
  off.width = S;
  off.height = S;
  const o = off.getContext("2d", { willReadFrequently: true })!;
  o.drawImage(mask, 0, 0, S, S);
  const alpha = o.getImageData(0, 0, S, S).data;
  const N = S * S;
  const TRANSP = 40;
  const OPENING_MAX = 220;

  const outside = new Uint8Array(N);
  const stack: number[] = [];
  const visit = (idx: number) => {
    if (!outside[idx] && alpha[idx * 4 + 3] < TRANSP) {
      outside[idx] = 1;
      stack.push(idx);
    }
  };
  for (let x = 0; x < S; x++) {
    visit(x);
    visit((S - 1) * S + x);
  }
  for (let y = 0; y < S; y++) {
    visit(y * S);
    visit(y * S + S - 1);
  }
  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % S;
    const y = (idx / S) | 0;
    if (x > 0) visit(idx - 1);
    if (x < S - 1) visit(idx + 1);
    if (y > 0) visit(idx - S);
    if (y < S - 1) visit(idx + S);
  }

  const vis = document.createElement("canvas");
  vis.width = S;
  vis.height = S;
  const vctx = vis.getContext("2d")!;
  const out = vctx.createImageData(S, S);
  const od = out.data;
  let minX = S,
    minY = S,
    maxX = 0,
    maxY = 0,
    count = 0;
  for (let i = 0; i < N; i++) {
    const a = alpha[i * 4 + 3];
    const isOpening = !outside[i] && a < OPENING_MAX;
    od[i * 4] = 255;
    od[i * 4 + 1] = 255;
    od[i * 4 + 2] = 255;
    od[i * 4 + 3] = isOpening ? 255 : 0;
    if (isOpening) {
      const x = i % S;
      const y = (i / S) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      count++;
    }
  }
  vctx.putImageData(out, 0, 0);

  const box: OpeningBox =
    count > 0
      ? { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
      : { cx: S / 2, cy: S * 0.42, w: S * 0.5, h: S * 0.3 };
  return { canvas: vis, box };
}

// ----------------------------------------------------- F1 decor scenes ---

type SceneId = "tarmac" | "grid" | "pit" | "podium" | "cockpit" | "checkered";

const SCENE_KEYS: { id: SceneId; labelKey: string }[] = [
  { id: "tarmac", labelKey: "avatar.scenes.tarmac" },
  { id: "grid", labelKey: "avatar.scenes.grid" },
  { id: "pit", labelKey: "avatar.scenes.pit" },
  { id: "podium", labelKey: "avatar.scenes.podium" },
  { id: "cockpit", labelKey: "avatar.scenes.cockpit" },
  { id: "checkered", labelKey: "avatar.scenes.checkered" },
];

type Ctx = CanvasRenderingContext2D;

function vignette(x: Ctx, S: number, strength = 0.45) {
  const vg = x.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.74);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${strength})`);
  x.fillStyle = vg;
  x.fillRect(0, 0, S, S);
}

function asphalt(x: Ctx, S: number) {
  const base = x.createLinearGradient(0, 0, S, S);
  base.addColorStop(0, "#30333A");
  base.addColorStop(0.5, "#23262B");
  base.addColorStop(1, "#191B1F");
  x.fillStyle = base;
  x.fillRect(0, 0, S, S);
  for (let i = 0; i < 7000; i++) {
    const t = Math.random() < 0.5 ? 0 : 255;
    x.fillStyle = `rgba(${t},${t},${t},${Math.random() * 0.06})`;
    x.fillRect(
      Math.random() * S,
      Math.random() * S,
      1 + Math.random() * 1.6,
      1 + Math.random() * 1.6,
    );
  }
}

/** Build a procedural, stylised F1 decor scene (cached per id). */
function buildScene(id: SceneId, S: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d")!;

  if (id === "tarmac") {
    asphalt(x, S);
    vignette(x, S);
  } else if (id === "grid") {
    asphalt(x, S);
    // Perspective start boxes (two columns receding).
    x.strokeStyle = "rgba(244,244,244,0.5)";
    x.lineWidth = Math.max(2, S / 170);
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const t = r / rows;
      const y = S * (0.58 + 0.38 * t);
      const boxH = S * (0.07 - t * 0.008);
      const boxW = S * (0.22 - t * 0.03);
      const off = S * (0.16 - t * 0.04);
      for (const cx of [S * 0.5 - off, S * 0.5 + off])
        x.strokeRect(cx - boxW / 2, y - boxH, boxW, boxH);
    }
    // Start-light gantry.
    x.fillStyle = "#0c0d10";
    x.fillRect(S * 0.18, S * 0.06, S * 0.64, S * 0.09);
    for (let i = 0; i < 5; i++) {
      x.fillStyle = "rgba(225,6,0,0.9)";
      x.beginPath();
      x.arc(S * (0.26 + i * 0.12), S * 0.105, S * 0.018, 0, Math.PI * 2);
      x.fill();
    }
    vignette(x, S, 0.5);
  } else if (id === "pit") {
    const wall = x.createLinearGradient(0, 0, 0, S * 0.62);
    wall.addColorStop(0, "#1a1d22");
    wall.addColorStop(1, "#101216");
    x.fillStyle = wall;
    x.fillRect(0, 0, S, S * 0.62);
    const floor = x.createLinearGradient(0, S * 0.62, 0, S);
    floor.addColorStop(0, "#26292f");
    floor.addColorStop(1, "#15171b");
    x.fillStyle = floor;
    x.fillRect(0, S * 0.62, S, S * 0.38);
    x.fillStyle = "rgba(225,6,0,0.85)";
    x.fillRect(0, S * 0.6, S, S * 0.012);
    x.fillStyle = "rgba(225,6,0,0.18)";
    x.fillRect(0, S * 0.55, S, S * 0.06);
    for (const px of [S * 0.08, S * 0.84]) {
      const g = x.createLinearGradient(px, 0, px + S * 0.08, 0);
      g.addColorStop(0, "rgba(255,255,255,0.08)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(px, 0, S * 0.08, S * 0.62);
    }
    const refl = x.createLinearGradient(0, S * 0.62, 0, S * 0.9);
    refl.addColorStop(0, "rgba(225,6,0,0.12)");
    refl.addColorStop(1, "rgba(225,6,0,0)");
    x.fillStyle = refl;
    x.fillRect(0, S * 0.62, S, S * 0.28);
    vignette(x, S, 0.4);
  } else if (id === "podium") {
    const bg = x.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, "#15171c");
    bg.addColorStop(1, "#0c0d11");
    x.fillStyle = bg;
    x.fillRect(0, 0, S, S);
    const sp = x.createRadialGradient(S / 2, 0, S * 0.05, S / 2, 0, S * 0.9);
    sp.addColorStop(0, "rgba(255,235,180,0.18)");
    sp.addColorStop(1, "rgba(255,235,180,0)");
    x.fillStyle = sp;
    x.fillRect(0, 0, S, S);
    const baseY = S * 0.98;
    const stepW = S * 0.22;
    const steps = [
      { cx: S * 0.5 - stepW, h: S * 0.18 },
      { cx: S * 0.5, h: S * 0.26 },
      { cx: S * 0.5 + stepW, h: S * 0.13 },
    ];
    for (const s of steps) {
      x.fillStyle = "#2a2d34";
      x.fillRect(s.cx - stepW / 2, baseY - s.h, stepW, s.h);
      x.fillStyle = "rgba(255,255,255,0.06)";
      x.fillRect(s.cx - stepW / 2, baseY - s.h, stepW, S * 0.012);
    }
    const cols = ["#E10600", "#F4F4F4", "#C9A227", "#3671C6"];
    for (let i = 0; i < 60; i++) {
      x.fillStyle = cols[(Math.random() * cols.length) | 0];
      x.globalAlpha = 0.5 + Math.random() * 0.4;
      x.fillRect(Math.random() * S, Math.random() * S * 0.6, S * 0.012, S * 0.02);
    }
    x.globalAlpha = 1;
    vignette(x, S, 0.35);
  } else if (id === "cockpit") {
    const bg = x.createLinearGradient(0, 0, 0, S);
    bg.addColorStop(0, "#0e0f13");
    bg.addColorStop(1, "#16181d");
    x.fillStyle = bg;
    x.fillRect(0, 0, S, S);
    // Converging cockpit walls.
    x.fillStyle = "#1c1f25";
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(S * 0.22, 0);
    x.lineTo(S * 0.06, S);
    x.lineTo(0, S);
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(S, 0);
    x.lineTo(S * 0.78, 0);
    x.lineTo(S * 0.94, S);
    x.lineTo(S, S);
    x.closePath();
    x.fill();
    // Halo bar over the top.
    x.strokeStyle = "#0a0b0e";
    x.lineWidth = S * 0.05;
    x.beginPath();
    x.arc(S / 2, S * 0.52, S * 0.42, Math.PI * 1.15, Math.PI * 1.85);
    x.stroke();
    // Steering wheel + rev LEDs at the bottom.
    x.fillStyle = "#0c0d10";
    x.beginPath();
    x.moveTo(S * 0.28, S);
    x.quadraticCurveTo(S * 0.5, S * 0.78, S * 0.72, S);
    x.closePath();
    x.fill();
    const leds = ["#10b981", "#10b981", "#E10600", "#E10600", "#C9A227", "#C9A227", "#3671C6"];
    for (let i = 0; i < leds.length; i++) {
      x.fillStyle = leds[i];
      x.beginPath();
      x.arc(S * (0.34 + i * 0.045), S * 0.85, S * 0.012, 0, Math.PI * 2);
      x.fill();
    }
    const gl = x.createRadialGradient(S / 2, S, S * 0.05, S / 2, S, S * 0.5);
    gl.addColorStop(0, "rgba(225,6,0,0.18)");
    gl.addColorStop(1, "rgba(225,6,0,0)");
    x.fillStyle = gl;
    x.fillRect(0, S * 0.6, S, S * 0.4);
    vignette(x, S, 0.4);
  } else {
    // checkered
    const n = 10;
    const cell = S / n;
    for (let r = 0; r < n; r++)
      for (let cc = 0; cc < n; cc++) {
        x.fillStyle = (r + cc) % 2 === 0 ? "#1d1f24" : "#272a30";
        x.fillRect(cc * cell, r * cell, cell, cell);
      }
    for (const band of [0, S - cell * 1.5]) {
      for (let cc = 0; cc < n; cc++) {
        x.fillStyle = cc % 2 === 0 ? "#0e0f12" : "#e8e8e8";
        x.globalAlpha = 0.9;
        x.fillRect(cc * cell, band, cell, cell * 1.5);
      }
    }
    x.globalAlpha = 1;
    vignette(x, S, 0.55);
  }
  return c;
}

const SCENE_CACHE = new Map<SceneId, HTMLCanvasElement>();
function getScene(id: SceneId, S: number): HTMLCanvasElement {
  let c = SCENE_CACHE.get(id);
  if (!c) {
    c = buildScene(id, S);
    SCENE_CACHE.set(id, c);
  }
  return c;
}

/** Small live preview of a decor scene, for the background chooser swatches. */
function SceneSwatch({ id, size = 64 }: { id: SceneId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = size;
    c.height = size;
    c.getContext("2d")!.drawImage(getScene(id, CANVAS_SIZE), 0, 0, size, size);
  }, [id, size]);
  return <canvas ref={ref} className="h-full w-full" />;
}

interface SkinEntry {
  mask: HTMLImageElement;
  visor: HTMLCanvasElement;
  box: OpeningBox;
}

// ---------------------------------------------------------- AvatarGenerator ---

export function AvatarGenerator({ onGenerated, onCancel }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("photo");
  const [skinIndex, setSkinIndex] = useState(0);
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [bg, setBg] = useState<BgChoice>(DEFAULT_BG);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryTeam, setLibraryTeam] = useState<string | null>(null);
  const [revealKey, setRevealKey] = useState(0);

  // Photo transform (position & scale relative to canvas)
  const [photoScale, setPhotoScale] = useState(1.2);
  const [photoX, setPhotoX] = useState(0);
  const [photoY, setPhotoY] = useState(0);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);
  const photoLayerRef = useRef<HTMLCanvasElement | null>(null);
  const maskImgRef = useRef<HTMLImageElement | null>(null);
  const visorMaskRef = useRef<HTMLCanvasElement | null>(null);
  const openingBoxRef = useRef<OpeningBox | null>(null);
  const faceBoxRef = useRef<FaceBox | null>(null);
  const skinCacheRef = useRef<Map<string, SkinEntry>>(new Map());
  const skinIndexRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Multi-touch gestures: pinch to zoom + one-finger drag to pan.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef({
    startDist: 0,
    startScale: 1,
    panStartX: 0,
    panStartY: 0,
    midStartX: 0,
    midStartY: 0,
    origX: 0,
    origY: 0,
  });
  // Mirror of the committed transform so gesture baselines never read stale state.
  const transformRef = useRef({ scale: photoScale, x: photoX, y: photoY });
  useEffect(() => {
    transformRef.current = { scale: photoScale, x: photoX, y: photoY };
  }, [photoScale, photoX, photoY]);

  const selectedSkin: AvatarSkin = ALL_SKINS[skinIndex] ?? ALL_SKINS[0];

  // --------------------------------------------------------- skin handling ---

  const ensureSkin = useCallback(async (index: number) => {
    const skin = ALL_SKINS[index];
    let entry = skinCacheRef.current.get(skin.file);
    if (!entry) {
      const mask = await loadImage(skinFullUrl(skin.file));
      const { canvas, box } = buildVisor(mask, CANVAS_SIZE);
      entry = { mask, visor: canvas, box };
      skinCacheRef.current.set(skin.file, entry);
    }
    maskImgRef.current = entry.mask;
    visorMaskRef.current = entry.visor;
    openingBoxRef.current = entry.box;
  }, []);

  const applyAutoPlacement = useCallback(() => {
    const photo = photoImgRef.current;
    const box = openingBoxRef.current;
    if (!photo || !box) return;
    const S = CANVAS_SIZE;
    const aspect = photo.width / photo.height;
    const fb = faceBoxRef.current;
    // Centre the EYE line in the visor opening and size by the inter-eye
    // distance (not the face width) so the face isn't too wide and the gaze
    // lands right in the slot.
    const eyeMidX = fb?.eyeMidX ?? fb?.cx ?? 0.5;
    const eyeMidY = fb?.eyeMidY ?? (fb ? fb.cy - fb.h * 0.12 : 0.42);
    const eyeDistN = Math.max(fb?.eyeDist ?? (fb ? fb.w * 0.46 : 0.22), 0.02);
    // Draw the eyes ~half the opening width apart → comfortably inside the slot.
    const targetEyeDist = box.w * 0.5;
    let drawW = targetEyeDist / eyeDistN;
    let drawH = drawW / aspect;
    let scale = drawH / S;
    scale = Math.min(Math.max(scale, 0.5), 3);
    drawH = S * scale;
    drawW = drawH * aspect;
    setPhotoScale(scale);
    setPhotoX(box.cx - eyeMidX * drawW - (S - drawW) / 2);
    setPhotoY(box.cy - eyeMidY * drawH - (S - drawH) / 2);
  }, []);

  const gotoSkin = useCallback(
    async (index: number) => {
      const i = ((index % ALL_SKINS.length) + ALL_SKINS.length) % ALL_SKINS.length;
      haptic("light");
      setSkinIndex(i);
      skinIndexRef.current = i;
      await ensureSkin(i);
      applyAutoPlacement();
      setRevealKey((k) => k + 1);
    },
    [ensureSkin, applyAutoPlacement],
  );

  // ----------------------------------------------------- helmet carousel ---
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const centeredCardIndex = (): number => {
    const el = carouselRef.current;
    if (!el) return skinIndexRef.current;
    const rect = el.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const cards = el.querySelectorAll<HTMLElement>("[data-skin-card]");
    let best = skinIndexRef.current;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  const handleCarouselScroll = () => {
    if (scrollIdleRef.current) clearTimeout(scrollIdleRef.current);
    scrollIdleRef.current = setTimeout(() => {
      const i = centeredCardIndex();
      if (i !== skinIndexRef.current) gotoSkin(i);
    }, 130);
  };

  const centerCard = (i: number, smooth = true) => {
    const card = carouselRef.current?.querySelectorAll<HTMLElement>("[data-skin-card]")[i];
    card?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      inline: "center",
      block: "nearest",
    });
  };

  const selectCard = (i: number) => {
    centerCard(i);
    if (i !== skinIndexRef.current) gotoSkin(i);
  };

  // Centre the active helmet card whenever we (re)enter the compose step.
  useEffect(() => {
    if (step !== "compose") return;
    const id = setTimeout(() => centerCard(skinIndexRef.current, false), 0);
    return () => clearTimeout(id);
  }, [step]);

  // ----------------------------------------------------------- photo input ---

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t("avatar.file_too_large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // --------------------------------------------------------- selfie camera ---

  const startCamera = async () => {
    setCameraError(null);
    if (!window.isSecureContext) {
      setCameraError(t("avatar.camera_errors.https_required"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t("avatar.camera_errors.not_supported"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      const e = err as DOMException;
      const msg =
        e.name === "NotAllowedError" || e.name === "SecurityError"
          ? t("avatar.camera_errors.permission_denied")
          : e.name === "NotFoundError" || e.name === "OverconstrainedError"
            ? t("avatar.camera_errors.not_found")
            : e.name === "NotReadableError"
              ? t("avatar.camera_errors.in_use")
              : t("avatar.camera_errors.generic");
      setCameraError(msg);
    }
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setShowCamera(false);
  }, []);

  useEffect(() => {
    if (!showCamera) return;
    const v = videoRef.current;
    if (!v || !streamRef.current) return;
    v.srcObject = streamRef.current;
    // React's `muted` JSX prop is unreliable; without the property set, browsers
    // treat the stream as unmuted and BLOCK autoplay → black/frozen preview.
    v.muted = true;
    v.setAttribute("playsinline", "");
    const tryPlay = () => {
      v.play().catch(() => {});
    };
    v.onloadedmetadata = tryPlay;
    v.oncanplay = tryPlay;
    tryPlay();
    return () => {
      v.onloadedmetadata = null;
      v.oncanplay = null;
    };
  }, [showCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) {
      setCameraError(t("avatar.camera_errors.not_ready"));
      return;
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    setPhotoSrc(c.toDataURL("image/jpeg", 0.92));
    stopCamera();
  };

  // --------------------------- photo loaded → detect face, prep, compose ---

  useEffect(() => {
    if (!photoSrc) return;
    let cancelled = false;
    setDetecting(true);
    setStep("compose");
    (async () => {
      try {
        const img = await loadImage(photoSrc);
        if (cancelled) return;
        photoImgRef.current = img;
        const fb = await detectFace(img).catch(() => null);
        if (cancelled) return;
        faceBoxRef.current = fb;
        await ensureSkin(skinIndexRef.current);
        if (cancelled) return;
        applyAutoPlacement();
        setRevealKey((k) => k + 1);
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSrc]);

  // --------------------------------------------------------- canvas render ---

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const mask = maskImgRef.current;
    if (!canvas || !mask) return;
    const ctx = canvas.getContext("2d")!;
    const S = CANVAS_SIZE;
    canvas.width = S;
    canvas.height = S;
    ctx.clearRect(0, 0, S, S);

    // 1. Background
    if (bg.kind === "color") {
      ctx.fillStyle = bg.value;
      ctx.fillRect(0, 0, S, S);
    } else if (bg.kind === "gradient") {
      const g = ctx.createLinearGradient(0, 0, S, S);
      g.addColorStop(0, bg.value[0]);
      g.addColorStop(1, bg.value[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    } else {
      ctx.drawImage(getScene(bg.id, S), 0, 0);
    }

    // 2. Photo, clipped to the visor opening
    const photo = photoImgRef.current;
    const visor = visorMaskRef.current;
    if (photo && visor) {
      if (!photoLayerRef.current) photoLayerRef.current = document.createElement("canvas");
      const layer = photoLayerRef.current;
      layer.width = S;
      layer.height = S;
      const lc = layer.getContext("2d")!;
      lc.clearRect(0, 0, S, S);
      const aspect = photo.width / photo.height;
      const drawH = S * photoScale;
      const drawW = drawH * aspect;
      const dx = (S - drawW) / 2 + photoX;
      const dy = (S - drawH) / 2 + photoY;
      lc.drawImage(photo, dx, dy, drawW, drawH);
      lc.globalCompositeOperation = "destination-in";
      lc.drawImage(visor, 0, 0);
      lc.globalCompositeOperation = "source-over";
      ctx.drawImage(layer, 0, 0);
    }

    // 3. Helmet frame on top
    ctx.drawImage(mask, 0, 0, S, S);
  }, [bg, photoScale, photoX, photoY]);

  useEffect(() => {
    if (step === "compose" || step === "background") renderCanvas();
  }, [step, renderCanvas, revealKey]);

  // ---------------------------------------------------------- drag & scale ---

  const canvasUnitScale = () => {
    const c = canvasRef.current;
    if (!c) return 1;
    const r = c.getBoundingClientRect();
    return r.width ? CANVAS_SIZE / r.width : 1;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (step !== "compose") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointersRef.current.values()];
    const g = gestureRef.current;
    g.origX = transformRef.current.x;
    g.origY = transformRef.current.y;
    if (pts.length >= 2) {
      const [a, b] = pts;
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.startScale = transformRef.current.scale;
      g.midStartX = (a.x + b.x) / 2;
      g.midStartY = (a.y + b.y) / 2;
    } else {
      g.panStartX = e.clientX;
      g.panStartY = e.clientY;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (step !== "compose" || !pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointersRef.current.values()];
    const k = canvasUnitScale();
    const g = gestureRef.current;
    if (pts.length >= 2) {
      // Pinch: scale relative to the initial finger distance.
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = g.startDist > 0 ? dist / g.startDist : 1;
      setPhotoScale(Math.min(Math.max(g.startScale * ratio, 0.5), 3));
      // Pan with the pinch midpoint so the photo tracks the fingers.
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      setPhotoX(g.origX + (midX - g.midStartX) * k);
      setPhotoY(g.origY + (midY - g.midStartY) * k);
    } else {
      setPhotoX(g.origX + (e.clientX - g.panStartX) * k);
      setPhotoY(g.origY + (e.clientY - g.panStartY) * k);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    const pts = [...pointersRef.current.entries()];
    const g = gestureRef.current;
    if (pts.length === 1) {
      // Re-baseline the remaining finger so pan continues smoothly after pinch.
      const [, p] = pts[0];
      g.panStartX = p.x;
      g.panStartY = p.y;
      g.origX = transformRef.current.x;
      g.origY = transformRef.current.y;
    }
  };

  const zoomIn = () => {
    haptic("light");
    setPhotoScale((s) => Math.min(s + 0.12, 3));
  };
  const zoomOut = () => {
    haptic("light");
    setPhotoScale((s) => Math.max(s - 0.12, 0.5));
  };

  // -------------------------------------------------------------- export ---

  const exportPng = async (): Promise<File> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("no canvas");
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("export failed");
    return new File([blob], "avatar-pilote.png", { type: "image/png" });
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      await onGenerated(await exportPng());
      haptic("success");
    } catch {
      haptic("error");
      alert(t("avatar.save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const file = await exportPng();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      haptic("success");
    } catch {
      haptic("error");
      alert(t("avatar.download_error"));
    } finally {
      setDownloading(false);
    }
  };

  // ----------------------------------------------------- background chooser ---

  const bgType = bg.kind;
  const setBgType = (kind: BgChoice["kind"]) => {
    haptic("light");
    if (kind === "scene") setBg({ kind: "scene", id: "tarmac" });
    else if (kind === "color") setBg({ kind: "color", value: BG_COLORS[0] });
    else setBg({ kind: "gradient", value: BG_GRADIENTS[0] });
  };

  const renderBgSwatches = () => {
    if (bgType === "scene") {
      const activeId = bg.kind === "scene" ? bg.id : null;
      return (
        <div className="grid grid-cols-3 gap-2">
          {SCENE_KEYS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                haptic("light");
                setBg({ kind: "scene", id: s.id });
              }}
              aria-pressed={activeId === s.id}
              className={`overflow-hidden rounded-md border text-left transition-all ${
                activeId === s.id
                  ? "border-pk-red ring-2 ring-pk-red/40"
                  : "border-white/15 hover:border-white/30"
              }`}
            >
              <div className="aspect-square w-full">
                <SceneSwatch id={s.id} />
              </div>
              <span className="block px-1.5 py-1 font-data text-[0.5rem] uppercase tracking-wider text-pk-titane">
                {t(s.labelKey)}
              </span>
            </button>
          ))}
        </div>
      );
    }
    const swatches =
      bgType === "color"
        ? BG_COLORS.map((value) => ({
            key: `c:${value}`,
            choice: { kind: "color", value } as BgChoice,
            style: { background: value },
          }))
        : BG_GRADIENTS.map((value) => ({
            key: `g:${value[0]}-${value[1]}`,
            choice: { kind: "gradient", value } as BgChoice,
            style: { background: `linear-gradient(135deg, ${value[0]}, ${value[1]})` },
          }));
    const activeKey = bgKey(bg);
    return (
      <div className="flex flex-wrap gap-2">
        {swatches.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              haptic("light");
              setBg(s.choice);
            }}
            aria-pressed={activeKey === s.key}
            className={`h-9 w-9 rounded-md border transition-all ${
              activeKey === s.key
                ? "border-pk-red ring-2 ring-pk-red/40 scale-105"
                : "border-white/15 hover:border-white/30"
            }`}
            style={s.style}
          />
        ))}
      </div>
    );
  };

  // ---------------------------------------------------------------- render ---

  const libraryTeams = libraryTeam
    ? AVATAR_TEAMS.filter((t) => t.id === libraryTeam)
    : AVATAR_TEAMS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (step === "background") {
              setStep("compose");
            } else if (step === "compose") {
              setStep("photo");
              setPhotoSrc(null);
              photoImgRef.current = null;
              faceBoxRef.current = null;
            } else {
              stopCamera();
              onCancel();
            }
          }}
          className="w-8 h-8 rounded-md flex items-center justify-center text-pk-titane hover:bg-white/[0.06] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-display text-sm text-pk-piste">
          {step === "photo" && t("avatar.steps.photo")}
          {step === "compose" && t("avatar.steps.compose")}
          {step === "background" && t("avatar.steps.background")}
        </h3>
      </div>

      {/* ── Step 1: Photo ──────────────────────────────────── */}
      {step === "photo" && (
        <div className="space-y-3">
          <p className="text-center text-sm text-pk-titane">{t("avatar.photo_intro")}</p>

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
                  {t("avatar.capture")}
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2.5 bg-white/[0.06] text-pk-titane rounded-lg font-display text-sm hover:bg-white/[0.1] transition-colors"
                >
                  {t("avatar.cancel")}
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
                {t("avatar.upload_photo")}
              </button>
              <button
                onClick={startCamera}
                className="w-full py-3 bg-white/[0.06] text-pk-piste rounded-lg font-display text-sm hover:bg-white/[0.1] transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                {t("avatar.take_selfie")}
              </button>
              {cameraError && (
                <p className="flex items-start gap-1.5 rounded-md border border-pk-red/30 bg-pk-red/10 px-3 py-2 text-[0.75rem] leading-snug text-pk-red">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                  {cameraError}
                </p>
              )}
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

      {/* ── Compose: helmet carousel (centred card = live composite, ──
           neighbours peek like the home carousel and invite swipe) ──── */}
      {step === "compose" && (
        <div className="-mx-4 space-y-2">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scrollbar-hide pb-1"
            style={{
              paddingLeft: "calc(50% - min(72vw, 240px) / 2)",
              paddingRight: "calc(50% - min(72vw, 240px) / 2)",
            }}
          >
            {ALL_SKINS.map((skin, i) => (
              <div
                key={skin.id}
                data-skin-card
                className="relative flex-shrink-0 snap-center"
                style={{ width: "min(72vw, 240px)" }}
              >
                <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-white/[0.12]">
                  {i === skinIndex ? (
                    <motion.div
                      key={revealKey}
                      initial={{ opacity: 0, scale: 1.08 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 22 }}
                      className="relative h-full w-full overflow-hidden"
                    >
                      <canvas
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                      />
                      {/* Snapchat-style sheen sweep on reveal */}
                      <motion.div
                        className="pointer-events-none absolute inset-0"
                        initial={{ x: "-120%", opacity: 0 }}
                        animate={{ x: "120%", opacity: [0, 0.6, 0] }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{
                          background:
                            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
                        }}
                      />
                      {detecting && (
                        <div className="absolute inset-0 grid place-items-center bg-pk-carbon/50 backdrop-blur-[1px]">
                          <div className="flex items-center gap-2 rounded-md bg-pk-carbon/80 px-3 py-2 font-data text-[0.625rem] uppercase tracking-wider text-pk-piste">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t("avatar.face_analysis")}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectCard(i)}
                      className="h-full w-full"
                      aria-label={t("avatar.choose_helmet", { team: skin.team })}
                    >
                      <img
                        src={skinThumbUrl(skin.file)}
                        alt={skin.team}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-55"
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center font-data text-[0.625rem] uppercase tracking-wider text-pk-titane">
            {t("avatar.helmet_counter", {
              team: selectedSkin.team,
              current: skinIndex + 1,
              total: ALL_SKINS.length,
            })}
          </p>
        </div>
      )}

      {/* ── Background: single composite preview ───────────── */}
      {step === "background" && (
        <div className="mx-auto" style={{ width: "min(100%, 260px)" }}>
          <motion.div
            key={revealKey}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-xl border-2 border-white/[0.12]"
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block w-full"
              style={{ aspectRatio: "1/1" }}
            />
          </motion.div>
        </div>
      )}

      {/* ── Step 2: Compose controls ───────────────────────── */}
      {step === "compose" && (
        <div className="space-y-3">
          <p className="flex items-center justify-center gap-1 text-center font-data text-[0.625rem] uppercase tracking-wider text-pk-titane/60">
            <Move className="h-3 w-3" />
            {t("avatar.drag_hint")}
          </p>

          {/* Zoom + library */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={zoomOut}
              className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.06] text-pk-titane hover:bg-white/[0.1]"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-14 text-center font-data text-xs text-pk-titane">
              {Math.round(photoScale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.06] text-pk-titane hover:bg-white/[0.1]"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                haptic("light");
                setShowLibrary((v) => !v);
              }}
              aria-pressed={showLibrary}
              className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                showLibrary
                  ? "border-pk-red/40 bg-pk-red-subtle text-pk-piste"
                  : "border-white/[0.08] bg-white/[0.06] text-pk-titane hover:bg-white/[0.1]"
              }`}
              aria-label={t("avatar.helmet_library")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Library grid */}
          {showLibrary && (
            <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setLibraryTeam(null)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 font-data text-[0.5625rem] uppercase tracking-wider ${
                    !libraryTeam ? "bg-pk-red text-white" : "bg-white/[0.04] text-pk-titane"
                  }`}
                >
                  {t("avatar.all_teams")}
                </button>
                {AVATAR_TEAMS.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setLibraryTeam(team.id)}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1 font-data text-[0.5625rem] uppercase tracking-wider ${
                      libraryTeam === team.id ? "text-white" : "bg-white/[0.04] text-pk-titane"
                    }`}
                    style={libraryTeam === team.id ? { backgroundColor: team.color } : undefined}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
              <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
                {libraryTeams.flatMap((team) =>
                  team.skins.map((skin) => {
                    const idx = ALL_SKINS.findIndex((s) => s.file === skin.file);
                    const active = idx === skinIndex;
                    return (
                      <button
                        key={skin.id}
                        onClick={() => {
                          gotoSkin(idx);
                          setShowLibrary(false);
                        }}
                        className={`overflow-hidden rounded-md border-2 transition-all ${
                          active ? "border-pk-red" : "border-white/[0.08] hover:border-white/[0.2]"
                        }`}
                      >
                        <img
                          src={skinThumbUrl(skin.file)}
                          alt={skin.team}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              haptic("light");
              setShowLibrary(false);
              setStep("background");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-pk-red py-3 font-display text-sm text-white transition-colors hover:bg-pk-red/90"
          >
            {t("avatar.next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Step 3: Background + actions ───────────────────── */}
      {step === "background" && (
        <div className="space-y-3">
          <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
            <p className="font-data text-[0.5625rem] uppercase tracking-[0.12em] text-pk-titane">
              {t("avatar.bg_label")}
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { k: "scene", labelKey: "avatar.bg_scene" },
                  { k: "gradient", labelKey: "avatar.bg_gradient" },
                  { k: "color", labelKey: "avatar.bg_color" },
                ] as const
              ).map((bgTab) => (
                <button
                  key={bgTab.k}
                  type="button"
                  onClick={() => setBgType(bgTab.k)}
                  className={`min-h-[32px] rounded-md border px-2 py-1 font-data text-[0.5625rem] uppercase tracking-wider transition-colors ${
                    bgType === bgTab.k
                      ? "border-pk-red/40 bg-pk-red-subtle text-pk-piste"
                      : "border-white/[0.08] bg-white/[0.03] text-pk-titane active:scale-[0.98]"
                  }`}
                >
                  {t(bgTab.labelKey)}
                </button>
              ))}
            </div>
            {renderBgSwatches()}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleApply}
              disabled={saving || downloading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-pk-red py-3 font-display text-sm text-white transition-colors hover:bg-pk-red/90 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("avatar.applying")}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t("avatar.apply")}
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={saving || downloading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] py-3 font-display text-sm text-pk-piste transition-colors hover:bg-white/[0.1] disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("avatar.downloading")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t("avatar.download")}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarGenerator;
