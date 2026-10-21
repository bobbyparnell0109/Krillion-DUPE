/**
 * Typed, crash-proof localStorage helpers (private mode and SSR safe).
 */
"use client";

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game still works, it just won't remember.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const KEYS = {
  playerId: "dd:playerId",
  muted: "dd:muted",
  seen: "dd:seenPrompts",
  dailyRun: (date: string) => `dd:daily:${date}`,
  dailyHistory: "dd:dailyHistory",
  infiniteBest: "dd:infiniteBest",
  infiniteTop: "dd:infiniteTop10",
  lastName: "dd:lastName",
} as const;

/** Anonymous, random, per-browser id. Not linked to any personal data. */
export function getPlayerId(): string {
  let id = readJson<string | null>(KEYS.playerId, null);
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = crypto.randomUUID().replace(/-/g, "");
    writeJson(KEYS.playerId, id);
  }
  return id;
}

const MAX_SEEN = 1000;

export function markSeen(promptId: string): void {
  const seen = readJson<string[]>(KEYS.seen, []);
  if (seen.includes(promptId)) return;
  seen.push(promptId);
  writeJson(KEYS.seen, seen.slice(-MAX_SEEN));
}

export function recentSeen(limit: number): string[] {
  return readJson<string[]>(KEYS.seen, []).slice(-limit);
}
