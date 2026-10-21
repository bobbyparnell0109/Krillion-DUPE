# DEEPDIVE architecture plan

This document is the stage 1 deliverable: the architecture and database schema the
rest of the build follows. The game name lives in one constant
(`src/config/site.ts` -> `SITE.name`), so renaming is a one line change.

## 1. Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | Route handlers for the game API, server actions for admin |
| Styling | Tailwind CSS v4 | Design tokens in `globals.css` |
| Database | Postgres (Supabase in production) via Prisma 6 | SQLite supported for local dev through a generated schema variant |
| AI | Anthropic SDK (`@anthropic-ai/sdk`), server only | Model set by `ANTHROPIC_MODEL`, structured JSON outputs validated with Zod |
| Hosting | Vercel | `vercel.json` cron hits the bank top-up route |
| Tests | Vitest | Pure logic: normalisation, fuzzy matching, rarity, scoring |

The Anthropic key is only read in `src/lib/ai/*`, which imports `server-only`, so a
client bundle that touches it fails the build.

## 2. Folder layout

```
prisma/
  schema.prisma            Postgres schema (source of truth)
  migrations/              Postgres migrations
scripts/
  seed-starter.ts          Hand written starter bank (no API key needed)
  seed-ai.ts               Generates prompts with Claude until the bank holds N (default 500)
  topup.ts                 Same pipeline as the cron route, from the CLI
  sqlite-schema.mjs        Writes prisma/sqlite/schema.prisma for SQLite dev
src/
  config/                  site.ts (name, URLs), game.ts (tiers, timers, bands)
  lib/
    db.ts                  Prisma singleton
    text/normalize.ts      Normalisation (accents, plurals, UK/US, "the", synonyms)
    text/fuzzy.ts          Damerau-Levenshtein + matcher
    text/profanity.ts      Profanity filter
    text/similarity.ts     Prompt de-duplication (semantic-ish token similarity)
    game/rarity.ts         Bayesian blend of AI prior and live counts -> tier
    game/scoring.ts        Tier -> points, depth, air bonus
    game/judge.ts          Match -> cache -> Claude judge -> review queue
    game/daily.ts          Seeded daily selection
    game/runs.ts           Server side run state for daily + infinite
    ai/client.ts           Anthropic client + JSON helper
    ai/prompts.ts          Prompt generation + quality filter + answer generation
    ai/judge.ts            Claude answer judgement
    bank/pipeline.ts       Generate -> filter -> dedupe -> answers -> store
    security/              rate limit, IP hashing, sanitising, admin auth
  app/                     Pages + API routes
  components/              Small UI components (game, ocean, layout)
  hooks/                   Client hooks (timer, sound, local storage)
```

## 3. Database schema (Prisma)

```
Prompt          id, text, normalized, signature, category, difficulty (easy|medium|hard),
                breadth (narrow|medium|wide), status (active|retired), source (starter|ai|admin),
                timesServed, totalSubmissions, validSubmissions, createdAt
Answer          id, promptId -> Prompt, canonical, normalized, priorTier (1..5),
                count (live submissions), source (ai|starter|review|judge), createdAt
                unique(promptId, normalized)
AnswerAlias     id, answerId -> Answer, promptId, normalized   unique(promptId, normalized)
Submission      id, promptId, answerId?, raw, normalized, mode (daily|infinite),
                runId, valid, tier, points, matchedBy (exact|alias|fuzzy|cache|ai|none), createdAt
JudgementCache  id, promptId, normalized, valid, answerId?, reason, createdAt
                unique(promptId, normalized)   -> the same answer is never judged twice
ReviewItem      id, promptId, raw, normalized, occurrences, aiVerdict, aiReason,
                status (pending|approved|rejected), createdAt, updatedAt
                unique(promptId, normalized)
DailyChallenge  id, date (YYYY-MM-DD, unique), promptIds (JSON text)
Run             id, token (secret), mode, date?, playerId, ipHash, name?,
                promptIds (JSON text, served order), currentIndex, currentPromptId?,
                promptIssuedAt?, airMs, depth, score, results (JSON text),
                status (active|finished), createdAt, finishedAt,
                dailyKey ("date:playerId", unique) for one daily run per player per day
RateLimit       key (PK), count, resetAt
```

JSON lists are stored as text so the same schema runs on SQLite and Postgres.

## 4. Core flows

### Answer matching (server)
1. Sanitise and length-limit the input (max 60 chars).
2. Normalise: lowercase, strip accents, `&` -> `and`, strip punctuation, drop leading
   `the/a/an`, UK -> US spelling map, global synonyms (`st` -> `saint`, `mt` -> `mount`),
   singularise each token.
3. Exact lookup against canonical answers and aliases (both stored normalised).
4. Fuzzy lookup: Damerau-Levenshtein with a length aware threshold, also comparing
   with spaces removed.
5. Judgement cache lookup.
6. Profanity check (only for unmatched answers so "great tit" still counts as a bird).
7. Claude judge (rate limited per IP). Valid -> maps to an existing canonical (alias
   added) or a new answer (created, flagged into the review queue). Invalid -> cached.
8. Anything rejected, or anything the AI could not judge, lands in `ReviewItem`.

### Rarity (Bayesian blend)
For prompt `p` with `N` live valid submissions, each answer `i` has a prior weight
`w_i` from its AI tier (tier 1 = very common ... tier 5 = very rare). The prior share is
`q_i = w_i / sum(w)`. The blended share is

```
share_i = (count_i + ALPHA * q_i) / (N + ALPHA)
```

`ALPHA` (default 40) is the prior's strength in pseudo-submissions, so the AI prior
dominates early and real data takes over as plays accumulate. Answers are sorted by
share and the cumulative share of all *more popular* answers picks the tier:

| Tier | Cumulative share above | Points | Depth | Air bonus |
| --- | --- | --- | --- | --- |
| Plankton | < 50% | 10 | 40m | +8s |
| Shallows | < 75% | 25 | 100m | +12s |
| Reef | < 90% | 45 | 180m | +12s |
| Deep Cut | >= 90% | 70 | 280m | +16s |
| One in a Million | Deep Cut, tied for the rarest answer on the board, and nobody has ever given it before | 100 | 400m | +16s |

"% of players gave the same answer" uses live counts once a prompt has 30+
submissions, otherwise the blended estimate (labelled as an estimate).

### Daily Dive
* `DailyChallenge` row for the date is created on first request using a PRNG seeded by
  the date, choosing 7 active prompts with a difficulty ramp and avoiding prompts used
  in the last 60 days. Once stored it never changes.
* Server run: `start` -> `next` (issues prompt, stamps `promptIssuedAt`) -> `answer`.
  The server rejects answers after 25s + 2s grace. Reveal time is never counted.
* Client keeps `{runId, token}` plus the reveal history in localStorage to resume.
* Streak, best, history in localStorage. Shareable emoji grid and `/share` card.

### Infinite Dive
* Air (45s) lives on the server run. Air drains only between `next` (prompt issued)
  and `answer`. Correct answers add +16/+12/+8s (capped at 60s). Run ends at 0.
* The client sends up to 500 recently seen prompt IDs at start; the server excludes
  those plus everything served in the run.
* Personal best and local top 10 in localStorage, global leaderboard from finished
  runs with a filtered name.

### Prompt bank pipeline
1. Pick under-represented categories.
2. Claude generates candidate prompts (with difficulty + breadth), shown a sample of
   existing prompts to avoid.
3. Second Claude pass rejects ambiguous, offensive, time-sensitive or opinion prompts.
4. De-duplicate against the bank: normalised token signature + Jaccard/containment
   similarity on stemmed content words with synonym folding (threshold 0.6).
5. Claude generates 80 to 250 answers with aliases and a prior tier for each.
6. Store prompt + answers in one transaction.

* `npm run seed:ai` fills the bank to 500 (resumable).
* `GET /api/cron/topup` (Vercel cron, `CRON_SECRET`) tops up when fewer than 200
  prompts have never been served.

## 5. Security
* All scoring on the server. The client only sends answer text and run tokens.
* DB backed fixed window rate limiting (works on serverless), keyed by salted IP hash.
* Input length limits (answers 60, names 16), control char stripping, Zod validation
  on every route.
* Profanity filter on leaderboard names and unmatched answers.
* Admin: password from `ADMIN_PASSWORD`, compared in constant time, HMAC signed
  httpOnly cookie, rate limited login.
