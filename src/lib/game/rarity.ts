/**
 * Rarity model: blends the AI prior with live answer counts (Bayesian style) and maps
 * each answer onto a tier. Pure functions, unit tested in rarity.test.ts.
 */
import { RARITY, type TierId } from "@/config/game";

export interface RarityInput {
  id: string;
  /** AI prior tier, 1 (very common) .. 5 (very rare). */
  priorTier: number;
  /** Live submissions that matched this answer. */
  count: number;
}

export interface RarityResult {
  /** Blended share of all valid answers, 0..1. */
  share: number;
  /** Share of answers strictly more popular than this one, 0..1. */
  cumulativeAbove: number;
  tier: TierId;
}

function priorWeight(tier: number): number {
  return RARITY.priorWeights[Math.min(5, Math.max(1, Math.round(tier)))] ?? 1;
}

/**
 * Blended share for every answer of a prompt.
 * share_i = (count_i + alpha * q_i) / (N + alpha), where q_i is the normalised prior.
 */
export function blendedShares(answers: RarityInput[], alpha: number = RARITY.alpha): Map<string, number> {
  const totalPrior = answers.reduce((sum, a) => sum + priorWeight(a.priorTier), 0) || 1;
  const totalCount = answers.reduce((sum, a) => sum + a.count, 0);
  const shares = new Map<string, number>();
  for (const a of answers) {
    const q = priorWeight(a.priorTier) / totalPrior;
    shares.set(a.id, (a.count + alpha * q) / (totalCount + alpha));
  }
  return shares;
}

/**
 * Compute the tier of one answer within its prompt.
 * `previousCount` is how many players gave it before this submission (used for the
 * "nobody has ever said this" rule of One in a Million).
 */
export function rarityFor(answers: RarityInput[], answerId: string, previousCount: number): RarityResult {
  const shares = blendedShares(answers);
  const share = shares.get(answerId) ?? 0;
  let cumulativeAbove = 0;
  for (const [id, s] of shares) {
    if (id !== answerId && s > share) cumulativeAbove += s;
  }
  const [c1, c2, c3] = RARITY.cumulativeCutoffs;
  let tier: TierId;
  if (cumulativeAbove < c1) tier = 1;
  else if (cumulativeAbove < c2) tier = 2;
  else if (cumulativeAbove < c3) tier = 3;
  else tier = 4;

  // One in a Million: tied for the rarest answer on the board AND nobody has given it before.
  const minShare = Math.min(...shares.values());
  if (tier === 4 && previousCount === 0 && share <= minShare * (1 + 1e-9)) {
    tier = 5;
  }
  return { share, cumulativeAbove, tier };
}

/**
 * Percentage of players who gave this answer, for the reveal. Uses live data once
 * the prompt has enough plays, otherwise the blended estimate.
 */
export function revealPercent(
  share: number,
  liveCount: number,
  totalValid: number,
): { percent: number; estimated: boolean } {
  if (totalValid >= RARITY.liveDataThreshold) {
    return { percent: (liveCount / totalValid) * 100, estimated: false };
  }
  return { percent: share * 100, estimated: true };
}
