/**
 * Site-wide branding. Rename the game here and everything else follows.
 */
export const GAME_NAME = "DEEPDIVE";

export const SITE = {
  name: GAME_NAME,
  tagline: "The trivia game where the rarest answer wins.",
  description: `${GAME_NAME} is a free daily trivia game. Name something, but dig deep: the fewer players who think of your answer, the deeper you dive.`,
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Day #1 of the Daily Dive, used to number share cards. */
  launchDate: "2026-10-21",
} as const;
