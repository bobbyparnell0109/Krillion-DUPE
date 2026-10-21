/**
 * Game tuning constants shared by client and server.
 * Changing a number here changes it everywhere (scoring is computed on the server).
 */

export type TierId = 0 | 1 | 2 | 3 | 4 | 5;

export interface TierDef {
  id: TierId;
  name: string;
  /** One-line flavour text shown on the reveal. */
  blurb: string;
  points: number;
  depth: number;
  /** Seconds of air added in Infinite Dive. */
  airBonus: number;
  emoji: string;
  /** Tailwind-friendly accent colour (hex) used in reveals and share cards. */
  color: string;
}

/** Tier 0 is "no match". Tiers 1..5 are accepted answers from most to least common. */
export const TIERS: Record<TierId, TierDef> = {
  0: { id: 0, name: "Washed Up", blurb: "Not on our charts.", points: 0, depth: 0, airBonus: 0, emoji: "⬛", color: "#64748b" },
  1: { id: 1, name: "Plankton", blurb: "Everyone floats here.", points: 10, depth: 40, airBonus: 8, emoji: "🟩", color: "#4ade80" },
  2: { id: 2, name: "Shallows", blurb: "A popular pick.", points: 25, depth: 100, airBonus: 12, emoji: "🟦", color: "#38bdf8" },
  3: { id: 3, name: "Reef", blurb: "Off the beaten path.", points: 45, depth: 180, airBonus: 12, emoji: "🟪", color: "#a78bfa" },
  4: { id: 4, name: "Deep Cut", blurb: "Very few went this deep.", points: 70, depth: 280, airBonus: 16, emoji: "🟧", color: "#fb923c" },
  5: { id: 5, name: "One in a Million", blurb: "Nobody has ever said this. Legendary.", points: 100, depth: 400, airBonus: 16, emoji: "🌟", color: "#facc15" },
};

export const ACCEPTED_TIERS: TierId[] = [1, 2, 3, 4, 5];

/** Rarity model (see docs/ARCHITECTURE.md). */
export const RARITY = {
  /** Prior strength in pseudo-submissions. Higher = trust the AI prior for longer. */
  alpha: 40,
  /** Relative weight of each AI prior tier (1 = very common ... 5 = very rare). */
  priorWeights: { 1: 40, 2: 14, 3: 5, 4: 1.5, 5: 0.5 } as Record<number, number>,
  /** Cumulative-share cut-offs for tiers 1..3. Anything beyond the last is Deep Cut. */
  cumulativeCutoffs: [0.5, 0.75, 0.9],
  /** Below this many submissions we label the percentage as an estimate. */
  liveDataThreshold: 30,
} as const;

export const DAILY = {
  promptCount: 7,
  secondsPerPrompt: 25,
  /** Network grace added on the server. */
  graceSeconds: 2,
  /** Don't reuse a prompt in the daily within this many days. */
  noRepeatDays: 60,
} as const;

export const INFINITE = {
  startingAirSeconds: 45,
  maxAirSeconds: 60,
  graceSeconds: 1.5,
  /** Max seen-prompt ids the client sends at run start. */
  maxExcludeIds: 500,
} as const;

export const LIMITS = {
  answerMaxLength: 60,
  nameMaxLength: 16,
} as const;

export interface DepthBand {
  min: number;
  name: string;
  emoji: string;
  description: string;
}

/** Five depth bands for the Daily Dive result (max possible depth is 7 x 400 = 2800m). */
export const DEPTH_BANDS: DepthBand[] = [
  { min: 0, name: "Sunlit Paddler", emoji: "🏖️", description: "You kept your head above water. Tomorrow, dive deeper." },
  { min: 500, name: "Twilight Drifter", emoji: "🐠", description: "The light is fading and the answers are getting stranger." },
  { min: 900, name: "Midnight Lurker", emoji: "🦑", description: "Pitch black down here, and you're thriving." },
  { min: 1400, name: "Abyssal Wanderer", emoji: "🐙", description: "Strange creatures, stranger answers. Respect." },
  { min: 2000, name: "Trench Legend", emoji: "🐋", description: "You found the bottom of the ocean. Nobody thinks like you." },
];

export function bandForDepth(depth: number): DepthBand & { index: number } {
  let index = 0;
  DEPTH_BANDS.forEach((band, i) => {
    if (depth >= band.min) index = i;
  });
  return { ...DEPTH_BANDS[index], index };
}

/** Categories the generator rotates through. */
export const CATEGORIES = [
  "food and drink",
  "geography",
  "film and tv",
  "music",
  "science",
  "history",
  "sport",
  "everyday objects",
  "language and words",
  "nature and animals",
  "internet culture",
  "art and design",
  "literature",
  "technology",
  "the human body",
  "jobs and work",
  "transport",
  "games and toys",
  "fashion",
  "mythology and religion",
  "space",
  "famous people",
  "home and garden",
  "holidays and traditions",
] as const;
