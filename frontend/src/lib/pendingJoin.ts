const PENDING_JOIN_CODE_KEY = "pendingJoinCode";
const JOIN_CODE_PATTERN = /^[A-Z0-9]{3,12}$/;

export function normalizeJoinCode(code: string | null | undefined): string | null {
  const normalized = (code ?? "").trim().toUpperCase();
  return JOIN_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function getPendingJoinCode(): string | null {
  try {
    return normalizeJoinCode(localStorage.getItem(PENDING_JOIN_CODE_KEY));
  } catch {
    return null;
  }
}

export function getPendingJoinPath(): string | null {
  const code = getPendingJoinCode();
  return code ? `/join/${code}` : null;
}

export function savePendingJoinCode(code: string | null | undefined): string | null {
  const normalized = normalizeJoinCode(code);
  if (!normalized) return null;

  try {
    localStorage.setItem(PENDING_JOIN_CODE_KEY, normalized);
  } catch {
    /* non-critical */
  }

  return normalized;
}

export function clearPendingJoinCode(): void {
  try {
    localStorage.removeItem(PENDING_JOIN_CODE_KEY);
  } catch {
    /* non-critical */
  }
}
