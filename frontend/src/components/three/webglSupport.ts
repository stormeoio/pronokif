let cachedSupport: boolean | null = null;

export function hasWebGLSupport() {
  if (cachedSupport !== null) return cachedSupport;
  if (typeof window === "undefined" || typeof document === "undefined") {
    cachedSupport = false;
    return cachedSupport;
  }

  try {
    const canvas = document.createElement("canvas");
    cachedSupport = Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    cachedSupport = false;
  }

  return cachedSupport;
}
