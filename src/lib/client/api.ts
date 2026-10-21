/**
 * Browser-side calls to the game API. Shapes mirror src/lib/game/runs.ts.
 */
"use client";

import type { TierId } from "@/config/game";

export interface LivePrompt {
  id: string;
  text: string;
  category: string;
  msLeft: number;
}

export interface RunResult {
  promptId: string;
  promptText: string;
  answer: string;
  canonical: string | null;
  tier: number;
  points: number;
  depth: number;
}

export interface RunState {
  runId: string;
  mode: "daily" | "infinite";
  date: string;
  status: "active" | "finished";
  index: number;
  total: number | null;
  depth: number;
  score: number;
  airMs: number;
  prompt: LivePrompt | null;
  results: RunResult[];
  name: string | null;
}

export interface Reveal {
  promptId: string;
  promptText: string;
  answer: string;
  canonical: string | null;
  valid: boolean;
  tier: TierId;
  tierName: string;
  points: number;
  depth: number;
  airBonus: number;
  percent: number;
  estimated: boolean;
  note?: string;
  topAnswers: string[];
  timedOut?: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}

export interface RunAuth {
  runId: string;
  token: string;
}

export const api = {
  startDaily: (playerId: string) => post<{ token: string; state: RunState }>("/api/daily/start", { playerId }),
  startInfinite: (playerId: string, excludeIds: string[]) =>
    post<{ token: string; state: RunState }>("/api/infinite/start", { playerId, excludeIds }),
  next: (auth: RunAuth) => post<{ state: RunState }>("/api/run/next", auth),
  state: (auth: RunAuth) => post<{ state: RunState }>("/api/run/state", auth),
  answer: (auth: RunAuth, answer: string) => post<{ reveal: Reveal; state: RunState }>("/api/run/answer", { ...auth, answer }),
  name: (auth: RunAuth, name: string) => post<{ state: RunState }>("/api/run/name", { ...auth, name }),
};
