/**
 * Daily Dive prompt selection, seeded by the UTC date so everyone gets the same set.
 * The chosen set is persisted on first use so it never changes during the day.
 */
import "server-only";
import { db, parseIdList } from "@/lib/db";
import { DAILY } from "@/config/game";

export function todayUtc(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Deterministic 32-bit hash of a string (FNV-1a). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Pickable {
  id: string;
  difficulty: string;
  category: string;
}

/**
 * Pick the day's prompts: a difficulty ramp (easy -> hard) with no repeated category
 * where possible. Pure function of the inputs, so the same seed gives the same set.
 */
export function pickDaily(pool: Pickable[], seed: string, count: number = DAILY.promptCount): string[] {
  const rand = seededRandom(hashString(seed));
  // Sort first so the result doesn't depend on database ordering.
  const shuffled = seededShuffle([...pool].sort((a, b) => a.id.localeCompare(b.id)), rand);
  const plan = ["easy", "easy", "medium", "medium", "medium", "hard", "hard"];
  const chosen: Pickable[] = [];
  const usedCats = new Set<string>();
  const take = (pred: (p: Pickable) => boolean) => {
    const hit = shuffled.find((p) => !chosen.includes(p) && pred(p));
    if (hit) {
      chosen.push(hit);
      usedCats.add(hit.category);
    }
    return Boolean(hit);
  };
  for (let i = 0; i < count; i++) {
    const want = plan[i] ?? "medium";
    take((p) => p.difficulty === want && !usedCats.has(p.category)) ||
      take((p) => p.difficulty === want) ||
      take((p) => !usedCats.has(p.category)) ||
      take(() => true);
  }
  const order = { easy: 0, medium: 1, hard: 2 } as Record<string, number>;
  return chosen.sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1)).map((p) => p.id);
}

/** Get (or create on first request) the prompt ids for a date. */
export async function getDailyPromptIds(date: string): Promise<string[]> {
  const existing = await db.dailyChallenge.findUnique({ where: { date } });
  if (existing) return parseIdList(existing.promptIds);

  // Avoid prompts used in recent dailies.
  const recent = await db.dailyChallenge.findMany({ orderBy: { date: "desc" }, take: DAILY.noRepeatDays });
  const recentIds = new Set(recent.flatMap((d) => parseIdList(d.promptIds)));
  const active = await db.prompt.findMany({ where: { status: "active" }, select: { id: true, difficulty: true, category: true } });
  let pool = active.filter((p) => !recentIds.has(p.id));
  if (pool.length < DAILY.promptCount) pool = active;
  if (pool.length < DAILY.promptCount) throw new Error("Not enough prompts in the bank for a daily challenge. Run the seed script.");

  const ids = pickDaily(pool, `daily:${date}`);
  try {
    await db.dailyChallenge.create({ data: { date, promptIds: JSON.stringify(ids) } });
    return ids;
  } catch {
    // Another request created it first: use theirs so everyone matches.
    const row = await db.dailyChallenge.findUniqueOrThrow({ where: { date } });
    return parseIdList(row.promptIds);
  }
}
