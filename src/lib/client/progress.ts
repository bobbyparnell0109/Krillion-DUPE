/**
 * Local progress: daily history and streaks, infinite personal bests, share text.
 */
"use client";

import { SITE } from "@/config/site";
import { TIERS, bandForDepth, type TierId } from "@/config/game";
import { KEYS, readJson, writeJson } from "./storage";

export interface DailyRecord {
  depth: number;
  score: number;
  tiers: number[];
}

export type DailyHistory = Record<string, DailyRecord>;

export function getDailyHistory(): DailyHistory {
  return readJson<DailyHistory>(KEYS.dailyHistory, {});
}

export function saveDailyRecord(date: string, record: DailyRecord) {
  const history = getDailyHistory();
  history[date] = record;
  writeJson(KEYS.dailyHistory, history);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Consecutive completed days ending today (or yesterday if today isn't played yet). */
export function currentStreak(today: string, history = getDailyHistory()): number {
  let day = history[today] ? today : shiftDate(today, -1);
  let streak = 0;
  while (history[day]) {
    streak++;
    day = shiftDate(day, -1);
  }
  return streak;
}

export function bestStreak(history = getDailyHistory()): number {
  const days = Object.keys(history).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev && shiftDate(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function dayNumber(date: string): number {
  const ms = new Date(`${date}T00:00:00Z`).getTime() - new Date(`${SITE.launchDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor(ms / 86_400_000) + 1);
}

export function shareUrl(date: string, depth: number, tiers: number[]): string {
  const params = new URLSearchParams({ d: String(depth), t: tiers.join(""), n: String(dayNumber(date)) });
  return `${SITE.url}/share?${params.toString()}`;
}

/** Emoji summary for the clipboard. */
export function shareText(date: string, depth: number, tiers: number[], streak: number): string {
  const band = bandForDepth(depth);
  const grid = tiers.map((t) => TIERS[(t as TierId) ?? 0]?.emoji ?? "⬛").join("");
  const lines = [
    `${SITE.name} #${dayNumber(date)} 🌊 ${depth.toLocaleString("en-GB")}m`,
    grid,
    `${band.emoji} ${band.name}${streak > 1 ? ` · 🔥 ${streak} day streak` : ""}`,
    shareUrl(date, depth, tiers),
  ];
  return lines.join("\n");
}

export interface LocalScore {
  depth: number;
  score: number;
  prompts: number;
  date: string;
}

export function getInfiniteTop(): LocalScore[] {
  return readJson<LocalScore[]>(KEYS.infiniteTop, []);
}

/** Record a finished infinite run; returns whether it is a new personal best. */
export function recordInfinite(entry: LocalScore): boolean {
  const top = [...getInfiniteTop(), entry].sort((a, b) => b.depth - a.depth).slice(0, 10);
  writeJson(KEYS.infiniteTop, top);
  const best = readJson<number>(KEYS.infiniteBest, 0);
  if (entry.depth > best) {
    writeJson(KEYS.infiniteBest, entry.depth);
    return true;
  }
  return false;
}

export function getInfiniteBest(): number {
  return readJson<number>(KEYS.infiniteBest, 0);
}
