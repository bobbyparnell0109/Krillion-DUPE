/**
 * Global leaderboards built from finished, named runs.
 */
import "server-only";
import { db } from "@/lib/db";
import { todayUtc } from "./daily";

export interface LeaderboardRow {
  rank: number;
  name: string;
  depth: number;
  score: number;
  prompts: number;
  finishedAt: string;
}

export async function getLeaderboard(mode: "daily" | "infinite", limit = 50): Promise<LeaderboardRow[]> {
  const rows = await db.run.findMany({
    where: { mode, status: "finished", name: { not: null }, ...(mode === "daily" ? { date: todayUtc() } : {}) },
    orderBy: [{ depth: "desc" }, { finishedAt: "asc" }],
    take: limit,
    select: { name: true, depth: true, score: true, currentIndex: true, finishedAt: true },
  });
  return rows.map((r, i) => ({
    rank: i + 1,
    name: r.name ?? "Anonymous",
    depth: r.depth,
    score: r.score,
    prompts: r.currentIndex,
    finishedAt: (r.finishedAt ?? new Date()).toISOString(),
  }));
}
