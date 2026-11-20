/**
 * Sole browser localStorage adapter for KidSudoku.
 * Domain schemas and durable-state writes live in `src/state/useProgress.ts`.
 */
export function readJsonStorage<T>(key: string, fallback: T, parse: (raw: unknown) => T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function writeJsonStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or privacy-mode errors gracefully
  }
}
