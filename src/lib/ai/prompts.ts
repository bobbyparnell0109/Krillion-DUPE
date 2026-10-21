/**
 * Claude-powered prompt bank generation: candidate prompts, a quality filter pass and
 * answer lists with rarity priors.
 */
import "server-only";
import { z } from "zod";
import { callJson } from "./client";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const BREADTHS = ["narrow", "medium", "wide"] as const;

const CandidateSchema = z.object({
  prompts: z.array(
    z.object({
      text: z.string().describe('The prompt, starting with "Name a" or "Name an" or "Name something"'),
      category: z.string(),
      difficulty: z.enum(DIFFICULTIES),
      breadth: z.enum(BREADTHS).describe("narrow: ~40-80 valid answers, medium: ~80-200, wide: 200+"),
    }),
  ),
});
export type Candidate = z.infer<typeof CandidateSchema>["prompts"][number];

const GENERATOR_SYSTEM = `You write prompts for a trivia game where players must name an answer that fits a category, and the RAREST valid answer scores the most.

Great prompts:
- Start with "Name a", "Name an" or "Name something".
- Have many objectively verifiable valid answers (at least 40), from obvious to obscure.
- Are fun for a general adult audience worldwide, not just one country.
- Are unambiguous: a reasonable judge could decide if any answer is valid.

Never write prompts that are:
- Opinion based ("Name a good movie"), time sensitive ("Name a current world leader"), offensive, sexual, about tragedies, or about private individuals.
- Answerable with a tiny closed set (e.g. "Name a primary colour").
- Trick questions or requiring a long explanation.`;

/** Ask Claude for fresh candidate prompts in one category, avoiding existing ones. */
export async function generateCandidates(category: string, count: number, avoid: string[]): Promise<Candidate[]> {
  const avoidList = avoid.slice(0, 120).map((t) => `- ${t}`).join("\n");
  const result = await callJson({
    system: GENERATOR_SYSTEM,
    schema: CandidateSchema,
    effort: "medium",
    user: `Write ${count} new, varied prompts in the category "${category}". Mix difficulties (easy, medium, hard) and breadths. Vary the angle: types of things, famous examples, things associated with a place or activity, words with a property, and so on.

These prompts already exist, so do not repeat them or write close rephrasings:
${avoidList || "(none yet)"}`,
  });
  return result.prompts.map((p) => ({ ...p, category }));
}

const FilterSchema = z.object({
  verdicts: z.array(
    z.object({
      index: z.number().int(),
      keep: z.boolean(),
      reason: z.string(),
    }),
  ),
});

/** Second pass: an independent review that rejects weak prompts. Returns the kept ones. */
export async function qualityFilter(candidates: Candidate[]): Promise<{ kept: Candidate[]; rejected: Array<{ text: string; reason: string }> }> {
  if (candidates.length === 0) return { kept: [], rejected: [] };
  const numbered = candidates.map((c, i) => `${i}. ${c.text}`).join("\n");
  const result = await callJson({
    system: `You are a strict quality reviewer for a "name the rarest valid answer" trivia game. Reject any prompt that is:
- ambiguous (validity of answers would be disputed),
- offensive, sexual, violent, about tragedies or likely to upset players,
- time sensitive (answers change over time, e.g. "current", "this year", records),
- opinion based ("best", "favourite", "good"),
- too narrow (fewer than about 40 valid answers) or a closed set a player could exhaust,
- not phrased as "Name a/an/something ...".
Keep everything else. Be decisive.`,
    schema: FilterSchema,
    effort: "low",
    user: `Review these prompts. Return one verdict per index.\n\n${numbered}`,
  });
  const keepIdx = new Set(result.verdicts.filter((v) => v.keep).map((v) => v.index));
  const reasons = new Map(result.verdicts.map((v) => [v.index, v.reason]));
  const kept: Candidate[] = [];
  const rejected: Array<{ text: string; reason: string }> = [];
  candidates.forEach((c, i) => {
    if (keepIdx.has(i)) kept.push(c);
    else rejected.push({ text: c.text, reason: reasons.get(i) ?? "no verdict" });
  });
  return { kept, rejected };
}

const AnswersSchema = z.object({
  answers: z.array(
    z.object({
      canonical: z.string().describe("Display form, properly capitalised"),
      aliases: z.array(z.string()).describe("Other accepted spellings, abbreviations or names. Empty if none."),
      tier: z.number().int().describe("1 = most players would say this, 2 = popular, 3 = known, 4 = obscure, 5 = very obscure"),
    }),
  ),
});
export type GeneratedAnswer = z.infer<typeof AnswersSchema>["answers"][number];

/** Generate a broad answer list (aim 80 to 250) with an estimated popularity tier each. */
export async function generateAnswers(promptText: string, breadth: string): Promise<GeneratedAnswer[]> {
  const target = breadth === "narrow" ? "60 to 100" : breadth === "wide" ? "180 to 250" : "100 to 180";
  const result = await callJson({
    system: `You build answer banks for a trivia game where players name something that fits a prompt and rarer valid answers score more. Answers must be factually correct, distinct (no duplicates or near duplicates), and each one should be something a player could plausibly type. Include obvious answers AND deep cuts. Estimate how often a typical adult player would give each answer.`,
    schema: AnswersSchema,
    effort: "medium",
    maxTokens: 32000,
    user: `Prompt: "${promptText}"

List ${target} valid answers. For each give the canonical display form, aliases (alternative spellings, abbreviations, UK/US variants, common short forms; empty array if none), and a popularity tier:
1 = most players would say this (only about 5 to 10 answers),
2 = popular,
3 = moderately known,
4 = obscure,
5 = very obscure but still valid.
Sort from most to least common.`,
  });
  return result.answers;
}
