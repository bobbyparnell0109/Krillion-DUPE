"use client";

/**
 * Infinite Dive: endless prompts against an air supply that only drains while a prompt
 * is live. Good answers refill air; the run ends when it hits zero.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { INFINITE, TIERS } from "@/config/game";
import { useRun } from "@/hooks/useRun";
import { useCountdown } from "@/hooks/useCountdown";
import { useSound } from "@/components/layout/Providers";
import type { SoundName } from "@/lib/client/sound";
import { OceanDepth } from "@/components/ocean/OceanBackdrop";
import { getInfiniteBest, getInfiniteTop, recordInfinite, type LocalScore } from "@/lib/client/progress";
import type { RunState } from "@/lib/client/api";
import { PromptCard } from "./PromptCard";
import { AnswerForm } from "./AnswerForm";
import { TimerBar } from "./TimerBar";
import { RevealCard } from "./RevealCard";
import { DepthMeter } from "./DepthMeter";
import { NameForm } from "./NameForm";
import { ErrorPanel, LoadingPanel } from "./Panels";

/** The meter scale grows as you go deeper so it never looks "full". */
function meterMax(depth: number) {
  return Math.max(2800, Math.ceil((depth * 1.25) / 500) * 500);
}

export function InfiniteGame() {
  const run = useRun("infinite");
  const { play } = useSound();
  const typed = useRef("");
  const { phase, state, reveal } = run;
  const [best, setBest] = useState(0);
  useEffect(() => setBest(getInfiniteBest()), [phase]);

  const promptKey = state?.prompt?.id ?? "none";
  const airLeft = useCountdown(
    state?.prompt?.msLeft ?? INFINITE.startingAirSeconds * 1000,
    phase === "playing",
    () => void run.submit(typed.current.trim()),
    promptKey,
  );

  useEffect(() => {
    if (phase !== "reveal" || !reveal) return;
    play(reveal.valid && reveal.tier > 0 ? (`tier${reveal.tier}` as SoundName) : "wrong");
  }, [phase, reveal, play]);

  const onFinalSeconds = useCallback(() => play("tick"), [play]);
  const depth = state?.depth ?? 0;
  const over = state?.status === "finished";

  return (
    <div className="relative pr-12 sm:pr-16">
      {/* Infinite gets darker on a slower curve so long runs still have somewhere to go. */}
      <OceanDepth ratio={1 - Math.exp(-depth / 2500)} />
      {phase !== "intro" && phase !== "loading" ? <DepthMeter depth={depth} maxDepth={meterMax(depth)} /> : null}

      {phase === "loading" ? <LoadingPanel /> : null}
      {phase === "error" ? <ErrorPanel message={run.error} onRetry={run.begin} /> : null}
      {phase === "intro" ? <InfiniteIntro best={best} onStart={run.begin} /> : null}

      {(phase === "playing" || phase === "submitting") && state?.prompt ? (
        <div className="pt-6">
          <PromptCard text={state.prompt.text} category={state.prompt.category} label={`Prompt ${state.index + 1}`} />
          <div className="mt-8">
            <TimerBar msLeft={airLeft} totalMs={INFINITE.maxAirSeconds * 1000} label="Air" onFinalSeconds={onFinalSeconds} />
          </div>
          <AnswerForm
            promptKey={promptKey}
            valueRef={typed}
            disabled={phase === "submitting"}
            onSubmit={(a) => {
              play("submit");
              void run.submit(a);
            }}
          />
          <p className="mt-4 text-center text-sm text-mist">
            Depth {depth}m · Air only drains while a prompt is on screen.
          </p>
        </div>
      ) : null}

      {phase === "reveal" && reveal && state ? (
        <>
          <RevealCard
            reveal={reveal}
            showAir
            continueLabel={over ? "Surface" : "Next prompt"}
            onContinue={() => (over ? run.finish() : void run.next())}
          />
          {!over ? (
            <p className="mt-3 text-center text-sm text-mist">Air remaining: {Math.ceil(state.airMs / 1000)}s</p>
          ) : (
            <p className="mt-3 text-center font-semibold text-coral">Out of air!</p>
          )}
        </>
      ) : null}

      {phase === "finished" && state ? <InfiniteSummary state={state} auth={run.auth.current} onAgain={run.reset} /> : null}
    </div>
  );
}

function InfiniteIntro({ best, onStart }: { best: number; onStart: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <section className="mx-auto max-w-xl pt-10 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black sm:text-5xl">Infinite Dive</h1>
      <p className="mt-4 text-lg text-mist">
        You start with {INFINITE.startingAirSeconds} seconds of air. It only drains while a prompt is live.
        Rare answers refill more air: +16s for the deepest tiers, +12s for the middle, +8s for Plankton.
        Wrong answers give nothing. How deep can you go?
      </p>
      {best > 0 ? <p className="mt-4 font-semibold text-glow">Your best: {best.toLocaleString("en-GB")}m</p> : null}
      <button
        ref={button}
        type="button"
        onClick={onStart}
        className="mt-8 min-h-14 rounded-2xl bg-glow px-10 text-lg font-bold text-abyss hover:brightness-110"
      >
        Take a breath and dive
      </button>
    </section>
  );
}

function InfiniteSummary({ state, auth, onAgain }: { state: RunState; auth: ReturnType<typeof useRun>["auth"]["current"]; onAgain: () => void }) {
  const { play } = useSound();
  const [top, setTop] = useState<LocalScore[]>([]);
  const [isBest, setIsBest] = useState(false);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    setIsBest(recordInfinite({ depth: state.depth, score: state.score, prompts: state.results.length, date: new Date().toISOString() }));
    setTop(getInfiniteTop());
    play("finish");
  }, [state, play]);

  const deepest = [...state.results].sort((a, b) => b.tier - a.tier)[0];
  return (
    <section className="glass animate-pop mx-auto mt-6 max-w-xl rounded-3xl p-6 text-center sm:p-8" aria-labelledby="inf-summary">
      <p className="text-sm uppercase tracking-[0.25em] text-glow">Run over</p>
      <h1 id="inf-summary" className="mt-2 font-[family-name:var(--font-display)] text-6xl font-black tabular-nums">
        {state.depth.toLocaleString("en-GB")}m
      </h1>
      {isBest ? <p className="mt-2 font-bold text-sunlit">New personal best! 🏆</p> : null}
      <p className="mt-2 text-mist">
        {state.results.length} prompts · {state.score} points
      </p>
      {deepest && deepest.tier > 0 ? (
        <p className="mt-2 text-mist">
          Deepest answer: <strong className="text-foam">{deepest.canonical ?? deepest.answer}</strong>{" "}
          <span style={{ color: TIERS[deepest.tier as 1].color }}>({TIERS[deepest.tier as 1].name})</span>
        </p>
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-3">
        <NameForm auth={auth} initialName={state.name} />
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onAgain} className="min-h-12 rounded-2xl bg-glow px-6 font-bold text-abyss hover:brightness-110">
            Dive again
          </button>
          <Link href="/leaderboard" className="inline-flex min-h-12 items-center rounded-2xl border border-foam/40 px-6 font-semibold hover:bg-white/10">
            Leaderboard
          </Link>
        </div>
      </div>

      <h2 className="mt-8 text-left text-lg font-bold">Your top 10 (this device)</h2>
      <ol className="mt-2 space-y-1 text-left text-sm">
        {top.map((t, i) => (
          <li key={`${t.date}-${i}`} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
            <span>{i + 1}. {new Date(t.date).toLocaleDateString("en-GB")}</span>
            <span className="font-mono">{t.depth.toLocaleString("en-GB")}m · {t.prompts} prompts</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
