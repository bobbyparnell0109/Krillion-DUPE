/**
 * Records a submission and turns an evaluation into a scored reveal.
 */
import "server-only";
import { db } from "@/lib/db";
import { TIERS, type TierId } from "@/config/game";
import { rarityFor, revealPercent } from "./rarity";
import { rewardFor, type Reward } from "./scoring";
import type { Evaluation } from "./judge";

/** What the client is shown after answering. */
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
  /** % of players who gave the same answer. */
  percent: number;
  estimated: boolean;
  note?: string;
  /** A few popular answers, shown after the reveal for fun. */
  topAnswers: string[];
  timedOut?: boolean;
}

export async function scoreAndRecord(opts: {
  promptId: string;
  raw: string;
  evaluation: Evaluation;
  mode: "daily" | "infinite";
  runId: string;
  timedOut?: boolean;
}): Promise<{ reveal: Reveal; reward: Reward }> {
  const { promptId, raw, evaluation, mode, runId, timedOut } = opts;
  const prompt = await db.prompt.findUniqueOrThrow({
    where: { id: promptId },
    select: { text: true, validSubmissions: true, answers: { select: { id: true, priorTier: true, count: true, canonical: true } } },
  });

  let tier: TierId = 0;
  let percent = 0;
  let estimated = true;
  if (evaluation.valid && evaluation.answerId) {
    const target = prompt.answers.find((a) => a.id === evaluation.answerId);
    const previousCount = target?.count ?? 0;
    const rarity = rarityFor(prompt.answers, evaluation.answerId, previousCount);
    tier = rarity.tier;
    // Include this submission in the percentage the player sees.
    const shown = revealPercent(rarity.share, previousCount + 1, prompt.validSubmissions + 1);
    percent = shown.percent;
    estimated = shown.estimated;
  }
  const reward = rewardFor(tier);

  await db.$transaction([
    db.submission.create({
      data: {
        promptId,
        answerId: evaluation.answerId,
        runId,
        raw: raw.slice(0, 80),
        normalized: evaluation.normalized.slice(0, 80),
        mode,
        valid: evaluation.valid,
        tier,
        points: reward.points,
        matchedBy: timedOut ? "timeout" : evaluation.matchedBy,
      },
    }),
    db.prompt.update({
      where: { id: promptId },
      data: { totalSubmissions: { increment: 1 }, validSubmissions: { increment: evaluation.valid ? 1 : 0 } },
    }),
    ...(evaluation.answerId ? [db.answer.update({ where: { id: evaluation.answerId }, data: { count: { increment: 1 } } })] : []),
  ]);

  const topAnswers = [...prompt.answers]
    .sort((a, b) => b.count - a.count || a.priorTier - b.priorTier)
    .slice(0, 3)
    .map((a) => a.canonical);

  return {
    reward,
    reveal: {
      promptId,
      promptText: prompt.text,
      answer: raw,
      canonical: evaluation.canonical,
      valid: evaluation.valid,
      tier,
      tierName: TIERS[tier].name,
      points: reward.points,
      depth: reward.depth,
      airBonus: TIERS[tier].airBonus,
      percent: Math.round(percent * 10) / 10,
      estimated,
      note: timedOut ? "Out of time!" : evaluation.note,
      topAnswers,
      timedOut,
    },
  };
}
