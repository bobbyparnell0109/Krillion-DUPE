/**
 * Server-authoritative run state for Daily Dive and Infinite Dive.
 *
 * Flow for both modes: start -> next (issues a prompt and starts its clock) -> answer
 * (scores it) -> next ... The clock only runs between `next` and `answer`, so time spent
 * on the reveal screen is never counted.
 */
import "server-only";
import { randomBytes } from "crypto";
import type { Run } from "@prisma/client";
import { db, parseIdList } from "@/lib/db";
import { DAILY, INFINITE } from "@/config/game";
import { evaluateAnswer, type Evaluation } from "./judge";
import { scoreAndRecord, type Reveal } from "./submit";
import { nextAir } from "./scoring";
import { getDailyPromptIds, todayUtc } from "./daily";

export type Mode = "daily" | "infinite";

export interface RunResult {
  promptId: string;
  promptText: string;
  answer: string;
  canonical: string | null;
  tier: number;
  points: number;
  depth: number;
}

export interface LivePrompt {
  id: string;
  text: string;
  category: string;
  /** Milliseconds left on this prompt's clock when the response was built. */
  msLeft: number;
}

/** Everything the client needs to render a run. Contains no secrets except the token on start. */
export interface RunState {
  runId: string;
  mode: Mode;
  date: string;
  status: "active" | "finished";
  index: number;
  total: number | null;
  depth: number;
  score: number;
  airMs: number;
  prompt: LivePrompt | null;
  results: RunResult[];
  name: string | null;
}

export class RunError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

function parseResults(value: string): RunResult[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RunResult[]) : [];
  } catch {
    return [];
  }
}

function msLimit(run: Run): number {
  return run.mode === "daily" ? DAILY.secondsPerPrompt * 1000 : run.airMs;
}

async function toState(run: Run): Promise<RunState> {
  let prompt: LivePrompt | null = null;
  if (run.status === "active" && run.currentPromptId && run.promptIssuedAt) {
    const p = await db.prompt.findUnique({ where: { id: run.currentPromptId }, select: { id: true, text: true, category: true } });
    if (p) {
      const elapsed = Date.now() - run.promptIssuedAt.getTime();
      prompt = { ...p, msLeft: Math.max(0, msLimit(run) - elapsed) };
    }
  }
  return {
    runId: run.id,
    mode: run.mode as Mode,
    date: run.date,
    status: run.status as RunState["status"],
    index: run.currentIndex,
    total: run.mode === "daily" ? DAILY.promptCount : null,
    depth: run.depth,
    score: run.score,
    airMs: run.airMs,
    prompt,
    results: parseResults(run.results),
    name: run.name,
  };
}

/** Load a run and check the caller holds its token. */
export async function loadRun(runId: string, token: string): Promise<Run> {
  const run = await db.run.findUnique({ where: { id: runId } });
  if (!run || run.token.length !== token.length || run.token !== token) throw new RunError("Run not found", 404);
  return run;
}

export async function getState(runId: string, token: string): Promise<RunState> {
  return toState(await loadRun(runId, token));
}

/** Start (or resume) today's daily run for a player. One run per player per day. */
export async function startDaily(playerId: string, ipHash: string): Promise<{ token: string; state: RunState }> {
  const date = todayUtc();
  const dailyKey = `${date}:${playerId}`;
  const existing = await db.run.findUnique({ where: { dailyKey } });
  if (existing) return { token: existing.token, state: await toState(existing) };
  const promptIds = await getDailyPromptIds(date);
  try {
    const run = await db.run.create({
      data: { token: newToken(), mode: "daily", date, dailyKey, playerId, ipHash, promptIds: JSON.stringify(promptIds) },
    });
    return { token: run.token, state: await toState(run) };
  } catch {
    const run = await db.run.findUniqueOrThrow({ where: { dailyKey } });
    return { token: run.token, state: await toState(run) };
  }
}

export async function startInfinite(playerId: string, ipHash: string, excludeIds: string[]): Promise<{ token: string; state: RunState }> {
  const run = await db.run.create({
    data: {
      token: newToken(),
      mode: "infinite",
      playerId,
      ipHash,
      airMs: INFINITE.startingAirSeconds * 1000,
      excludeIds: JSON.stringify(excludeIds.slice(0, INFINITE.maxExcludeIds)),
    },
  });
  return { token: run.token, state: await toState(run) };
}

/** Choose the next infinite prompt: never repeats within a run, avoids the client's seen list. */
async function pickInfinitePrompt(run: Run): Promise<string | null> {
  const served = parseIdList(run.promptIds);
  const exclude = [...served, ...parseIdList(run.excludeIds)];
  const pick = async (notIn: string[]) => {
    // Favour prompts that have been served least, then pick randomly among them for variety.
    const pool = await db.prompt.findMany({
      where: { status: "active", id: { notIn } },
      orderBy: { timesServed: "asc" },
      take: 40,
      select: { id: true },
    });
    return pool.length ? pool[Math.floor(Math.random() * pool.length)].id : null;
  };
  // If the player has seen everything, fall back to "not in this run".
  return (await pick(exclude)) ?? (await pick(served));
}

/** Issue the next prompt (idempotent: re-calling returns the live prompt with its clock running). */
export async function nextPrompt(runId: string, token: string): Promise<RunState> {
  const run = await loadRun(runId, token);
  if (run.status !== "active") return toState(run);
  if (run.currentPromptId && run.promptIssuedAt) return toState(run);

  let promptId: string | null;
  let promptIds = run.promptIds;
  if (run.mode === "daily") {
    const ids = parseIdList(run.promptIds);
    promptId = ids[run.currentIndex] ?? null;
    if (!promptId) {
      const done = await db.run.update({ where: { id: run.id }, data: { status: "finished", finishedAt: new Date() } });
      return toState(done);
    }
  } else {
    promptId = await pickInfinitePrompt(run);
    if (!promptId) throw new RunError("The prompt bank is empty. Try again later.", 503);
    promptIds = JSON.stringify([...parseIdList(run.promptIds), promptId]);
  }

  // Conditional update guards against two tabs racing to issue a prompt.
  const claimed = await db.run.updateMany({
    where: { id: run.id, currentPromptId: null, status: "active" },
    data: { currentPromptId: promptId, promptIssuedAt: new Date(), promptIds },
  });
  if (claimed.count === 1) await db.prompt.update({ where: { id: promptId }, data: { timesServed: { increment: 1 } } });
  return toState(await db.run.findUniqueOrThrow({ where: { id: run.id } }));
}

/**
 * Answer the live prompt. Elapsed time is measured on the server. Returns the reveal and
 * the new run state.
 */
export async function answerPrompt(runId: string, token: string, rawAnswer: string, ipHash: string): Promise<{ reveal: Reveal; state: RunState }> {
  const run = await loadRun(runId, token);
  if (run.status !== "active") throw new RunError("This run is over.", 409);
  if (!run.currentPromptId || !run.promptIssuedAt) throw new RunError("No live prompt. Request the next one first.", 409);

  const promptId = run.currentPromptId;
  const elapsed = Date.now() - run.promptIssuedAt.getTime();

  // Claim the prompt first so a double submit can't be scored twice.
  const claimed = await db.run.updateMany({
    where: { id: run.id, currentPromptId: promptId, status: "active" },
    data: { currentPromptId: null, promptIssuedAt: null },
  });
  if (claimed.count !== 1) throw new RunError("Already answered.", 409);

  let timedOut: boolean;
  let effectiveElapsed = elapsed;
  if (run.mode === "daily") {
    timedOut = elapsed > (DAILY.secondsPerPrompt + DAILY.graceSeconds) * 1000;
  } else {
    // A little latency allowance per answer, then air drains.
    effectiveElapsed = Math.max(0, elapsed - INFINITE.graceSeconds * 1000);
    timedOut = effectiveElapsed >= run.airMs;
  }

  const evaluation: Evaluation = timedOut
    ? { valid: false, answerId: null, canonical: null, normalized: "", matchedBy: "timeout" }
    : await evaluateAnswer(promptId, rawAnswer, ipHash);

  const { reveal, reward } = await scoreAndRecord({
    promptId,
    raw: timedOut ? "" : rawAnswer,
    evaluation,
    mode: run.mode as Mode,
    runId: run.id,
    timedOut,
  });

  const results = parseResults(run.results);
  results.push({
    promptId,
    promptText: reveal.promptText,
    answer: reveal.answer,
    canonical: reveal.canonical,
    tier: reveal.tier,
    points: reveal.points,
    depth: reveal.depth,
  });

  const data: Partial<Run> = {
    results: JSON.stringify(results),
    currentIndex: run.currentIndex + 1,
    depth: run.depth + reward.depth,
    score: run.score + reward.points,
  };
  if (run.mode === "daily") {
    if (run.currentIndex + 1 >= DAILY.promptCount) {
      data.status = "finished";
      data.finishedAt = new Date();
    }
  } else {
    const air = timedOut ? 0 : nextAir(run.airMs, effectiveElapsed, reveal.valid ? reward : null);
    data.airMs = air;
    if (air <= 0) {
      data.status = "finished";
      data.finishedAt = new Date();
    }
  }
  const updated = await db.run.update({ where: { id: run.id }, data });
  return { reveal, state: await toState(updated) };
}

/** Attach a (pre-validated) leaderboard name to a finished run. */
export async function nameRun(runId: string, token: string, name: string): Promise<RunState> {
  const run = await loadRun(runId, token);
  if (run.status !== "finished") throw new RunError("Finish the run first.", 409);
  const updated = await db.run.update({ where: { id: run.id }, data: { name } });
  return toState(updated);
}
