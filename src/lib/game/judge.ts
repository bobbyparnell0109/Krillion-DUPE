/**
 * Server-side answer evaluation:
 * exact -> alias -> fuzzy -> judgement cache -> profanity -> Claude judge -> review queue.
 */
import "server-only";
import { db } from "@/lib/db";
import { normalizeAnswer } from "@/lib/text/normalize";
import { fuzzyFind } from "@/lib/text/fuzzy";
import { isProfane } from "@/lib/text/profanity";
import { aiAvailable } from "@/lib/ai/client";
import { judgeAnswer } from "@/lib/ai/judge";
import { rateLimit } from "@/lib/security/rateLimit";

export type MatchedBy = "exact" | "alias" | "fuzzy" | "cache" | "ai" | "none" | "timeout";

export interface Evaluation {
  valid: boolean;
  answerId: string | null;
  canonical: string | null;
  normalized: string;
  matchedBy: MatchedBy;
  /** Short explanation for the player when the answer is not accepted. */
  note?: string;
}

interface PromptAnswers {
  id: string;
  text: string;
  answers: Array<{ id: string; canonical: string; normalized: string }>;
  aliases: Array<{ answerId: string; normalized: string }>;
}

async function loadPromptAnswers(promptId: string): Promise<PromptAnswers | null> {
  const prompt = await db.prompt.findUnique({
    where: { id: promptId },
    select: { id: true, text: true, answers: { select: { id: true, canonical: true, normalized: true } } },
  });
  if (!prompt) return null;
  const aliases = await db.answerAlias.findMany({ where: { promptId }, select: { answerId: true, normalized: true } });
  return { ...prompt, aliases };
}

/** Pure matching against the stored lists (no I/O). */
export function matchLocal(normalized: string, data: PromptAnswers): { answerId: string; matchedBy: MatchedBy } | null {
  const exact = data.answers.find((a) => a.normalized === normalized);
  if (exact) return { answerId: exact.id, matchedBy: "exact" };
  const alias = data.aliases.find((a) => a.normalized === normalized);
  if (alias) return { answerId: alias.answerId, matchedBy: "alias" };
  const hit = fuzzyFind(normalized, [
    ...data.answers.map((a) => ({ key: a.normalized, id: a.id })),
    ...data.aliases.map((a) => ({ key: a.normalized, id: a.answerId })),
  ]);
  if (hit) return { answerId: hit.id, matchedBy: "fuzzy" };
  return null;
}

/** Add or bump an item in the admin review queue. */
async function logForReview(promptId: string, raw: string, normalized: string, aiVerdict: string, aiReason: string) {
  await db.reviewItem.upsert({
    where: { promptId_normalized: { promptId, normalized } },
    create: { promptId, raw, normalized, aiVerdict, aiReason: aiReason.slice(0, 300) },
    update: { occurrences: { increment: 1 } },
  });
}

async function cacheJudgement(promptId: string, normalized: string, valid: boolean, answerId: string | null, reason: string) {
  await db.judgementCache.upsert({
    where: { promptId_normalized: { promptId, normalized } },
    create: { promptId, normalized, valid, answerId, reason: reason.slice(0, 300) },
    update: { valid, answerId, reason: reason.slice(0, 300) },
  });
}

/** Create an answer, tolerating a concurrent insert of the same answer. */
async function ensureAnswer(promptId: string, canonical: string, tier: number): Promise<string> {
  const normalized = normalizeAnswer(canonical);
  const existing = await db.answer.findUnique({ where: { promptId_normalized: { promptId, normalized } } });
  if (existing) return existing.id;
  try {
    const created = await db.answer.create({
      data: { promptId, canonical: canonical.slice(0, 80), normalized, priorTier: Math.min(5, Math.max(1, tier || 4)), source: "judge" },
    });
    return created.id;
  } catch {
    const again = await db.answer.findUnique({ where: { promptId_normalized: { promptId, normalized } } });
    if (!again) throw new Error("Could not create answer");
    return again.id;
  }
}

async function addAlias(promptId: string, answerId: string, normalized: string) {
  try {
    await db.answerAlias.create({ data: { promptId, answerId, normalized } });
  } catch {
    // Already exists (race or earlier mapping): fine.
  }
}

/**
 * Evaluate a player's answer for a prompt. Never trusts the client: everything is
 * recomputed here. `ipHash` scopes the per-IP AI judging rate limit.
 */
export async function evaluateAnswer(promptId: string, raw: string, ipHash: string): Promise<Evaluation> {
  const normalized = normalizeAnswer(raw);
  const invalid = (matchedBy: MatchedBy, note?: string): Evaluation => ({ valid: false, answerId: null, canonical: null, normalized, matchedBy, note });
  if (!normalized) return invalid("none", "No answer given.");

  const data = await loadPromptAnswers(promptId);
  if (!data) return invalid("none", "Unknown prompt.");
  const canonicalOf = (id: string) => data.answers.find((a) => a.id === id)?.canonical ?? null;

  const local = matchLocal(normalized, data);
  if (local) return { valid: true, answerId: local.answerId, canonical: canonicalOf(local.answerId), normalized, matchedBy: local.matchedBy };

  const cached = await db.judgementCache.findUnique({ where: { promptId_normalized: { promptId, normalized } } });
  if (cached) {
    if (cached.valid && cached.answerId) {
      const canonical = canonicalOf(cached.answerId);
      if (canonical) return { valid: true, answerId: cached.answerId, canonical, normalized, matchedBy: "cache" };
    }
    if (!cached.valid) {
      await logForReview(promptId, raw, normalized, "invalid", cached.reason);
      return invalid("cache", "Not an accepted answer.");
    }
  }

  // Unmatched profanity is rejected without bothering the judge or the review queue.
  if (isProfane(raw)) return invalid("none", "Not an accepted answer.");

  if (!aiAvailable()) {
    await logForReview(promptId, raw, normalized, "unjudged", "AI judge not configured");
    return invalid("none", "Not on our list (sent for review).");
  }
  const limit = await rateLimit("judge", ipHash);
  if (!limit.ok) {
    await logForReview(promptId, raw, normalized, "unjudged", "Judge rate limit reached");
    return invalid("none", "Not on our list (sent for review).");
  }

  try {
    const verdict = await judgeAnswer(data.text, data.answers.map((a) => a.canonical), raw);
    if (!verdict.valid) {
      await cacheJudgement(promptId, normalized, false, null, verdict.reason);
      await logForReview(promptId, raw, normalized, "invalid", verdict.reason);
      return invalid("ai", "Our judge didn't accept that one.");
    }
    const existing = verdict.matchesExisting
      ? data.answers.find((a) => normalizeAnswer(a.canonical) === normalizeAnswer(verdict.matchesExisting))
      : undefined;
    if (existing) {
      await addAlias(promptId, existing.id, normalized);
      await cacheJudgement(promptId, normalized, true, existing.id, verdict.reason);
      return { valid: true, answerId: existing.id, canonical: existing.canonical, normalized, matchedBy: "ai" };
    }
    const display = (verdict.newCanonical || raw).trim();
    const answerId = await ensureAnswer(promptId, display, verdict.tier);
    if (normalizeAnswer(display) !== normalized) await addAlias(promptId, answerId, normalized);
    await cacheJudgement(promptId, normalized, true, answerId, verdict.reason);
    // New AI-accepted answers go to the queue so an admin can confirm or overrule.
    await logForReview(promptId, raw, normalized, "valid", verdict.reason);
    return { valid: true, answerId, canonical: display, normalized, matchedBy: "ai" };
  } catch (err) {
    console.error("judge failed", err);
    await logForReview(promptId, raw, normalized, "unjudged", (err as Error).message);
    return invalid("none", "Not on our list (sent for review).");
  }
}
