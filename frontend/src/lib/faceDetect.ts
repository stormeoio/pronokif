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
    const result = detector.detect(img);
    const detections = result.detections ?? [];
    if (!detections.length) return null;

    let best = detections[0].boundingBox;
    let bestArea = best ? best.width * best.height : 0;
    for (const d of detections) {
      const bb = d.boundingBox;
      if (!bb) continue;
      const area = bb.width * bb.height;
      if (area > bestArea) {
        best = bb;
        bestArea = area;
      }
    }
    if (!best) return null;

    return {
      cx: (best.originX + best.width / 2) / iw,
      cy: (best.originY + best.height / 2) / ih,
      w: best.width / iw,
      h: best.height / ih,
    };
  } catch {
    return null;
  }
}
