/**
 * Lazy face detection for the avatar generator.
 *
 * Uses MediaPipe Tasks Vision (BlazeFace short-range). The JS runtime is bundled
 * (dynamic import keeps it out of the main chunk); the WASM + model are fetched
 * from CDN on first use. All failures degrade gracefully to `null` so the
 * generator falls back to a heuristic placement.
 */
import type { FaceDetector } from "@mediapipe/tasks-vision";

const MP_VERSION = "0.10.35";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export interface FaceBox {
  /** Centre of the detected face, normalised to [0,1] of the image. */
  cx: number;
  cy: number;
  /** Face width / height, normalised to [0,1] of the image. */
  w: number;
  h: number;
  /** Eye-line midpoint, normalised to [0,1] (when keypoints are available). */
  eyeMidX?: number;
  eyeMidY?: number;
  /** Inter-eye distance, normalised to [0,1] of the image width. */
  eyeDist?: number;
}

let detectorPromise: Promise<FaceDetector | null> | null = null;

async function getDetector(): Promise<FaceDetector | null> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        return await vision.FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "IMAGE",
        });
      } catch {
        return null;
      }
    })();
  }
  return detectorPromise;
}

/**
 * Detect the largest face in an image. Returns a normalised box, or `null` if
 * detection is unavailable or no face is found.
 */
export async function detectFace(img: HTMLImageElement): Promise<FaceBox | null> {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return null;
  try {
    const detector = await getDetector();
    if (!detector) return null;
    const detections = detector.detect(img).detections ?? [];
    if (!detections.length) return null;

    // Largest detection by bounding-box area.
    let best = detections[0];
    let bestArea = best.boundingBox ? best.boundingBox.width * best.boundingBox.height : 0;
    for (const d of detections) {
      const bb = d.boundingBox;
      if (!bb) continue;
      const area = bb.width * bb.height;
      if (area > bestArea) {
        best = d;
        bestArea = area;
      }
    }
    const bb = best.boundingBox;
    if (!bb) return null;

    const face: FaceBox = {
      cx: (bb.originX + bb.width / 2) / iw,
      cy: (bb.originY + bb.height / 2) / ih,
      w: bb.width / iw,
      h: bb.height / ih,
    };

    // BlazeFace keypoints (normalised): index 0 = one eye, 1 = the other.
    const kp = best.keypoints;
    if (kp && kp.length >= 2) {
      const a = kp[0];
      const b = kp[1];
      face.eyeMidX = (a.x + b.x) / 2;
      face.eyeMidY = (a.y + b.y) / 2;
      face.eyeDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    return face;
  } catch {
    return null;
  }
}
