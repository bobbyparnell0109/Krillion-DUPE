/**
 * Prompt bank pipeline: generate -> quality filter -> de-duplicate -> answers -> store.
 * Used by the seed script, the CLI top-up and the cron route.
 */
import "server-only";
import { db } from "@/lib/db";
import { CATEGORIES } from "@/config/game";
import { generateAnswers, generateCandidates, qualityFilter } from "@/lib/ai/prompts";
import { findDuplicate, promptSignature } from "@/lib/text/similarity";
import { storePrompt } from "./store";

export const MIN_ANSWERS = 40;
export const UNPLAYED_TARGET = 200;

export type Logger = (message: string) => void;

export interface PipelineReport {
  generated: number;
  rejectedByFilter: number;
  duplicates: number;
  failedAnswers: number;
  stored: number;
}

/** Prompts that have never been served to anyone. */
export async function unplayedCount(): Promise<number> {
  return db.prompt.count({ where: { status: "active", timesServed: 0 } });
}

/** Categories ordered from least to most represented, so the bank stays balanced. */
async function categoriesByNeed(): Promise<string[]> {
  const counts = await db.prompt.groupBy({ by: ["category"], _count: { _all: true } });
  const byCat = new Map(counts.map((c) => [c.category, c._count._all]));
  return [...CATEGORIES].sort((a, b) => (byCat.get(a) ?? 0) - (byCat.get(b) ?? 0) || Math.random() - 0.5);
}

/** Run `fn` over items with at most `limit` in flight. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Generate and store up to `wanted` new prompts.
 * `deadline` (epoch ms) stops early so serverless functions don't time out.
 */
export async function generatePrompts(
  wanted: number,
  log: Logger = () => {},
  opts: { perCategory?: number; concurrency?: number; deadline?: number } = {},
): Promise<PipelineReport> {
  const perCategory = opts.perCategory ?? 8;
  const concurrency = opts.concurrency ?? 4;
  const report: PipelineReport = { generated: 0, rejectedByFilter: 0, duplicates: 0, failedAnswers: 0, stored: 0 };
  const timeLeft = () => !opts.deadline || Date.now() < opts.deadline;

  const existing = await db.prompt.findMany({ select: { text: true, signature: true, category: true } });
  const signatures = existing.map((p) => p.signature);

  // Cap rounds so a run of duplicates or failures can't loop forever.
  let rounds = 0;
  const maxRounds = Math.ceil(wanted / perCategory) * 3 + 3;
  while (report.stored < wanted && timeLeft() && rounds++ < maxRounds) {
    const categories = (await categoriesByNeed()).slice(0, Math.max(1, Math.ceil((wanted - report.stored) / perCategory)));
    const batches = await mapLimit(categories, concurrency, async (category) => {
      try {
        const avoid = existing.filter((p) => p.category === category).map((p) => p.text);
        const candidates = await generateCandidates(category, perCategory, avoid);
        report.generated += candidates.length;
        const { kept, rejected } = await qualityFilter(candidates);
        report.rejectedByFilter += rejected.length;
        rejected.forEach((r) => log(`  filter rejected: ${r.text} (${r.reason})`));
        return kept;
      } catch (err) {
        log(`  generation failed for ${category}: ${(err as Error).message}`);
        return [];
      }
    });

    // De-duplicate against the bank and within this batch.
    const fresh = batches.flat().filter((c) => {
      const sig = promptSignature(c.text);
      const dup = findDuplicate(sig, signatures);
      if (dup) {
        report.duplicates++;
        log(`  duplicate: ${c.text} ~ [${dup}]`);
        return false;
      }
      signatures.push(sig);
      return true;
    });
    if (fresh.length === 0 && batches.flat().length === 0) {
      log("No candidates produced, stopping.");
      break;
    }

    const toProcess = fresh.slice(0, wanted - report.stored);
    await mapLimit(toProcess, concurrency, async (candidate) => {
      if (!timeLeft()) return;
      try {
        const answers = await generateAnswers(candidate.text, candidate.breadth);
        if (answers.length < MIN_ANSWERS) {
          report.failedAnswers++;
          log(`  too few answers (${answers.length}): ${candidate.text}`);
          return;
        }
        const stored = await storePrompt(db, { ...candidate, source: "ai", answers });
        if (stored) {
          report.stored++;
          existing.push({ text: candidate.text, signature: promptSignature(candidate.text), category: candidate.category });
          log(`+ [${candidate.category}] ${candidate.text} (${stored.answers} answers)`);
        }
      } catch (err) {
        report.failedAnswers++;
        log(`  answers failed for "${candidate.text}": ${(err as Error).message}`);
      }
    });
  }
  return report;
}

/** Top the bank up so at least UNPLAYED_TARGET prompts are unplayed. */
export async function topUp(log: Logger = () => {}, opts: { maxNew?: number; deadline?: number } = {}): Promise<PipelineReport & { unplayedBefore: number }> {
  const unplayedBefore = await unplayedCount();
  const needed = Math.min(opts.maxNew ?? 40, Math.max(0, UNPLAYED_TARGET - unplayedBefore));
  if (needed === 0) {
    log(`Bank healthy: ${unplayedBefore} unplayed prompts.`);
    return { generated: 0, rejectedByFilter: 0, duplicates: 0, failedAnswers: 0, stored: 0, unplayedBefore };
  }
  log(`Only ${unplayedBefore} unplayed prompts, generating up to ${needed}.`);
  const report = await generatePrompts(needed, log, { deadline: opts.deadline });
  return { ...report, unplayedBefore };
}
