/**
 * Tier -> rewards. Shared by daily and infinite modes. Server side only callers
 * decide the tier; the client just displays the result.
 */
import { INFINITE, TIERS, type TierId } from "@/config/game";

export interface Reward {
  tier: TierId;
  points: number;
  depth: number;
  airBonusMs: number;
}

export function rewardFor(tier: TierId): Reward {
  const def = TIERS[tier];
  return { tier, points: def.points, depth: def.depth, airBonusMs: def.airBonus * 1000 };
}

/**
 * Apply elapsed thinking time and the reward to an infinite run's air supply.
 * The caller rejects answers that arrive later than the latency grace, so a valid answer
 * that lands right at the bell still earns its bonus. Returns the new air in ms
 * (0 means the run is over).
 */
export function nextAir(currentAirMs: number, elapsedMs: number, reward: Reward | null): number {
  const afterDrain = Math.max(0, currentAirMs - Math.max(0, elapsedMs));
  const bonus = reward ? reward.airBonusMs : 0;
  return Math.min(INFINITE.maxAirSeconds * 1000, afterDrain + bonus);
}
