# DEEPDIVE

A browser trivia game where the **rarest valid answer wins**. Players get prompts like
"Name a type of bridge"; obvious answers barely score, deep cuts send you to the bottom
of the ocean.

* **Daily Dive**: 7 prompts, 25 seconds each, the same for everyone that day. Depth
  bands, emoji share summary, streaks, resume after closing the tab.
* **Infinite Dive**: endless prompts against an air supply that only drains while a
  prompt is live. Good answers refill air. Personal best, local top 10, global
  leaderboard.
* **AI prompt bank**: Claude generates prompts and 80 to 250 answers each, a second
  pass filters weak prompts, near-duplicates are removed, and a cron keeps the bank
  topped up.
* **Live rarity**: an AI prior blended with real answer counts (Bayesian style).
  Unknown answers are judged by Claude (cached, rate limited) and logged for admin review.

The working title lives in one constant: `GAME_NAME` in `src/config/site.ts`.
Game tuning (tiers, points, timers, depth bands) lives in `src/config/game.ts`.

The architecture and database schema are documented in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Tech stack

* Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4
* Prisma 6 with Postgres (Supabase in production). SQLite works for local dev.
* Anthropic API via `@anthropic-ai/sdk` (server only, model `claude-opus-5-5` by default)
* Vitest for unit tests, Vercel for hosting and cron

## 1. Setup

Requires Node 20+ (22 recommended).

```bash
npm install
cp .env.example .env     # then fill in the values below
```

### Environment variables

| Variable | Required | What it is |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. On Supabase use the pooled "Transaction" URL with `?pgbouncer=true&connection_limit=1`. |
| `DIRECT_URL` | yes | Direct Postgres URL used by migrations. On Supabase the "Session" / direct URL. Locally the same as `DATABASE_URL`. |
| `ANTHROPIC_API_KEY` | for AI | Used for prompt generation, the quality filter and answer judging. Never sent to the browser. Without it the game still runs on the starter bank and unknown answers go straight to the review queue. |
| `ANTHROPIC_MODEL` | no | Override the model (default `claude-opus-5-5`). |
| `NEXT_PUBLIC_SITE_URL` | yes in prod | Public URL, used for metadata, sitemap and share links (e.g. `https://deepdive.example.com`). |
| `ADMIN_PASSWORD` | for admin | Password for `/admin` (8+ characters). |
| `APP_SECRET` | yes | Long random string. Salts IP hashes and signs the admin cookie. |
| `CRON_SECRET` | for cron | Long random string. Vercel Cron sends it as a Bearer token to `/api/cron/topup`. |

Generate secrets with `openssl rand -base64 32`.

## 2. Database

### Postgres (recommended, matches production)

Local Postgres or a free Supabase project both work.

```bash
# Local example
createdb deepdive
# .env: DATABASE_URL and DIRECT_URL = postgresql://user:pass@localhost:5432/deepdive

npx prisma migrate dev        # creates tables from prisma/migrations
```

### SQLite (quick local dev, no Postgres needed)

```bash
# .env: DATABASE_URL="file:./dev.db"   (DIRECT_URL is not needed)
npm run db:sqlite             # derives prisma/sqlite/schema.prisma, pushes it, generates the client
npm run seed:starter
npm run dev
```

The SQLite schema is generated from `prisma/schema.prisma`, so there is only one schema
to maintain. Use SQLite for `npm run dev` only: `npm run build` regenerates the Postgres
client.

## 3. Seeding the prompt bank

```bash
npm run seed:starter     # 48 hand-written prompts, no API key needed, playable immediately
npm run seed:ai          # Claude generates prompts until the bank holds 500 (resumable)
npm run seed:ai -- 800   # custom target
npm run seed             # both of the above
```

`seed:ai` runs the full pipeline for each batch: generate candidates per category,
second-pass quality filter, semantic de-duplication against the bank, generate
answers with rarity priors, store. It logs every rejection and duplicate. Expect it
to take a while and to use a meaningful number of tokens (each prompt is three
model calls, the answer list being the large one); it works in chunks of 40 and can
be stopped and re-run at any time.

## 4. Running

```bash
npm run dev        # http://localhost:3000
npm test           # unit tests (normalisation, fuzzy matching, rarity, scoring, daily seeding)
npm run lint
npm run typecheck
npm run build && npm start
```

## 5. Keeping the bank topped up (cron)

`GET /api/cron/topup` generates new prompts whenever fewer than 200 active prompts
have never been served. It needs `Authorization: Bearer $CRON_SECRET` and creates at
most 30 prompts per call (stopping early before the serverless time limit).

* **On Vercel** it is scheduled in `vercel.json` (daily at 04:00 UTC, which the Hobby
  plan allows). On Pro you can make it hourly, e.g. `"0 * * * *"`.
* **Manually**: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/topup`
* **From the CLI**: `npm run topup` (same logic, no time limit, up to 200 prompts).
* **From the admin**: `/admin` has a "Generate prompts now" button.

## 6. Deploying to Vercel

1. Create a Supabase project. Copy the pooled connection string (port 6543, add
   `?pgbouncer=true&connection_limit=1`) as `DATABASE_URL` and the direct one (port
   5432) as `DIRECT_URL`.
2. From your machine, with those values in `.env`, run the migrations and seed:
   ```bash
   npx prisma migrate deploy
   npm run seed:starter
   npm run seed:ai
   ```
3. Import the repo into Vercel. Add all the environment variables above
   (`NEXT_PUBLIC_SITE_URL` = your production URL).
4. Optionally set the Build Command to `npx prisma migrate deploy && npm run build`
   so future schema changes apply automatically.
5. Deploy. Vercel picks up the cron in `vercel.json` and sends `CRON_SECRET` for you.
6. Visit `/admin`, log in, and check the stats page.

## 7. Admin

`/admin` (password from `ADMIN_PASSWORD`):

* **Stats**: bank size, unplayed prompts, submissions, runs, AI status, prompts per category.
* **Review queue**: unmatched answers sorted by frequency. Approve as a new answer
  (with a tier), map onto an existing answer (adds an alias), or reject. AI-accepted
  answers also appear here so you can overrule them. Decisions update the judgement
  cache so the same answer is never judged again.
* **Prompts**: search, edit text, retire/reactivate, add/delete answers, adjust prior
  tiers, and see each answer's live count and current tier.

## How scoring works (short version)

Each answer has a prior tier from the AI (1 = very common to 5 = very obscure). With
`N` live submissions, an answer's share is `(count + 40 * prior_share) / (N + 40)`,
so the prior dominates early and real data takes over as people play. Answers are
ranked by share; the cumulative share of more popular answers decides the tier
(Plankton < 50%, Shallows < 75%, Reef < 90%, otherwise Deep Cut). **One in a Million**
is a Deep Cut that is tied for the rarest on the board and that nobody has given
before. Constants are in `src/config/game.ts`.

## Project layout

```
prisma/              schema + migrations
scripts/             seeding, top-up, starter bank, SQLite schema generator
src/config/          site name, game constants
src/lib/ai/          Claude calls (server only)
src/lib/bank/        prompt pipeline and storage
src/lib/game/        rarity, scoring, judging, runs, daily seeding, leaderboard
src/lib/text/        normalisation, fuzzy match, profanity, prompt similarity
src/lib/security/    rate limiting, IP hashing, sanitising, admin auth
src/lib/client/      browser storage, API client, sound, local progress
src/components/      UI (game, ocean, layout, content)
src/app/             pages, API routes, admin, OG images, sitemap, robots
```

---

## Manual test checklist

Run through these after deploying (and after big changes):

1. **Landing**: hero, Play Daily / Play Infinite buttons, how-to-play, FAQ disclosures open with keyboard.
2. **Daily Dive**: start, answer all 7. Check the timer counts down, auto-submits what you typed at 0, and the reveal shows tier, points, depth and percentage.
3. **Daily resume**: close the tab after prompt 3, reopen `/play/daily`, you should continue from prompt 4 (the reveal you were on is skipped, never re-scored).
4. **Daily once per day**: after finishing, reload. You should see the summary, not a new run.
5. **Share**: copy the summary, paste it somewhere, open the link. The `/share` page and its preview image (`/api/og?...`) should show your depth and band.
6. **Streak**: play two days in a row (or edit `dd:dailyHistory` in localStorage) and check the streak.
7. **Matching**: try accents (`Pokémon`), plurals, `the` prefix, UK/US spellings (`colour`), a one-letter typo on a long answer, and a short wrong word (`car` for `cat` must not match).
8. **AI judge**: with `ANTHROPIC_API_KEY` set, give a valid answer that is not in the list. It should be accepted and appear in the admin review queue as "valid". Give the same answer again: it should be instant (cached).
9. **Infinite Dive**: air drains only while a prompt is shown, not on reveals. Rare answers add 16s, mid 12s, Plankton 8s, wrong answers 0. Let air run out: "Out of air!", then the summary.
10. **Leaderboards**: add a name after a run; check `/leaderboard`. Try a rude name: it must be refused.
11. **Anti-cheat**: in dev tools, try calling `/api/run/answer` twice for one prompt (second gets 409) and changing the score client side (no effect on the server).
12. **Rate limits**: spam answers quickly (>90/min) and you should get a "Slow down" error.
13. **Admin**: wrong password is refused, right password logs in. Approve, map and reject review items; retire a prompt and check it no longer appears.
14. **Cron**: `curl` the top-up route without a token (401) and with it (report JSON). Watch new prompts appear in `/admin/prompts`.
15. **Accessibility**: play a whole daily with the keyboard only (Enter submits, Enter continues). Turn on "reduce motion" in your OS: bubbles and pop animations should stop. Check with a screen reader that prompts and results are announced.
16. **Sound**: the speaker icon mutes and the choice survives a reload.
17. **Mobile**: play on a phone; the keyboard should not hide the input and the depth meter should not cover text.
18. **SEO**: check `/sitemap.xml`, `/robots.txt` and that pages show a preview card when shared.
