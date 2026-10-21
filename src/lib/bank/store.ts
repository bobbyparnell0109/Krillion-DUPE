/**
 * Writing prompts and answers into the bank. No AI imports, so the starter seed can use
 * it without an API key.
 */
import type { PrismaClient } from "@prisma/client";
import { normalizeAnswer } from "@/lib/text/normalize";
import { promptSignature } from "@/lib/text/similarity";

export interface NewAnswer {
  canonical: string;
  aliases?: string[];
  tier: number;
}

export interface NewPrompt {
  text: string;
  category: string;
  difficulty: string;
  breadth: string;
  source: "starter" | "ai" | "admin";
  answers: NewAnswer[];
}

function clampTier(t: number): number {
  return Math.min(5, Math.max(1, Math.round(Number.isFinite(t) ? t : 3)));
}

/**
 * Insert a prompt with its answers and aliases in one transaction.
 * Duplicate answers (same normalised form) are merged, aliases that collide with another
 * answer's key are dropped. Returns null if the prompt text already exists.
 */
export async function storePrompt(db: PrismaClient, input: NewPrompt): Promise<{ id: string; answers: number } | null> {
  const normalized = normalizeAnswer(input.text);
  const exists = await db.prompt.findUnique({ where: { normalized } });
  if (exists) return null;

  // Build a clean answer list keyed by normalised canonical.
  const answers = new Map<string, { canonical: string; tier: number; aliases: Set<string> }>();
  for (const a of input.answers) {
    const canonical = a.canonical.trim().slice(0, 80);
    const key = normalizeAnswer(canonical);
    if (!key) continue;
    const entry = answers.get(key) ?? { canonical, tier: clampTier(a.tier), aliases: new Set<string>() };
    for (const alias of a.aliases ?? []) {
      const ak = normalizeAnswer(alias);
      if (ak && ak !== key) entry.aliases.add(ak);
    }
    answers.set(key, entry);
  }
  // An alias may not shadow another canonical answer, and each alias maps to one answer only.
  const taken = new Set(answers.keys());
  for (const entry of answers.values()) {
    for (const alias of [...entry.aliases]) {
      if (taken.has(alias)) entry.aliases.delete(alias);
      else taken.add(alias);
    }
  }

  return db.$transaction(async (tx) => {
    const prompt = await tx.prompt.create({
      data: {
        text: input.text.trim(),
        normalized,
        signature: promptSignature(input.text),
        category: input.category,
        difficulty: input.difficulty,
        breadth: input.breadth,
        source: input.source,
      },
    });
    for (const [key, entry] of answers) {
      await tx.answer.create({
        data: {
          promptId: prompt.id,
          canonical: entry.canonical,
          normalized: key,
          priorTier: entry.tier,
          source: input.source === "starter" ? "starter" : "ai",
          aliases: { create: [...entry.aliases].map((n) => ({ promptId: prompt.id, normalized: n })) },
        },
      });
    }
    return { id: prompt.id, answers: answers.size };
  }, { timeout: 60_000 });
}
