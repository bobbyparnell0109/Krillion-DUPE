/**
 * Fixed-window rate limiter backed by the database so it works across serverless
 * instances. Good enough for a game; swap for Redis/Upstash at large scale.
 */
import { db } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: Date;
}

export const LIMITS = {
  answer: { limit: 90, windowMs: 60_000 },
  judge: { limit: 20, windowMs: 60_000 },
  startRun: { limit: 30, windowMs: 60 * 60_000 },
  leaderboard: { limit: 20, windowMs: 60 * 60_000 },
  adminLogin: { limit: 8, windowMs: 15 * 60_000 },
} as const;

export type LimitName = keyof typeof LIMITS;

export async function rateLimit(name: LimitName, subject: string): Promise<RateLimitResult> {
  const { limit, windowMs } = LIMITS[name];
  const key = `${name}:${subject}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  const existing = await db.rateLimit.findUnique({ where: { key } });
  if (!existing || existing.resetAt <= now) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    // Opportunistic cleanup of stale rows (1% of calls).
    if (Math.random() < 0.01) await db.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  const updated = await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: updated.count <= limit, remaining: Math.max(0, limit - updated.count), resetAt: updated.resetAt };
}
