"use client";

/**
 * Daily Dive: 7 prompts, 25 seconds each, the same for everyone today.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DAILY, TIERS, bandForDepth, type TierId } from "@/config/game";
import { useRun } from "@/hooks/useRun";
import { useCountdown } from "@/hooks/useCountdown";
import { useSound } from "@/components/layout/Providers";
import type { SoundName } from "@/lib/client/sound";
import { OceanDepth } from "@/components/ocean/OceanBackdrop";
import { currentStreak, saveDailyRecord, shareText } from "@/lib/client/progress";
import { PromptCard } from "./PromptCard";
import { AnswerForm } from "./AnswerForm";
import { TimerBar } from "./TimerBar";
import { RevealCard } from "./RevealCard";
import { DepthMeter } from "./DepthMeter";
import { CopyButton } from "./CopyButton";
import { NameForm } from "./NameForm";
import { ErrorPanel, LoadingPanel } from "./Panels";

const MAX_DEPTH = DAILY.promptCount * TIERS[5].depth;

export function DailyGame() {
  const run = useRun("daily");
  const { play } = useSound();
  const typed = useRef("");
  const { phase, state, reveal } = run;

  const promptKey = state?.prompt?.id ?? "none";
  const msLeft = useCountdown(
    state?.prompt?.msLeft ?? DAILY.secondsPerPrompt * 1000,
    phase === "playing",
    () => {
      // Time's up: submit whatever was typed (the server checks the clock).
      void run.submit(typed.current.trim());
    },
    promptKey,
  );

  useEffect(() => {
    if (phase !== "reveal" || !reveal) return;
    play(reveal.valid && reveal.tier > 0 ? (`tier${reveal.tier}` as SoundName) : "wrong");
  }, [phase, reveal, play]);

  const depth = state?.depth ?? 0;
  const isLast = state ? state.index >= DAILY.promptCount : false;
  const onFinalSeconds = useCallback(() => play("tick"), [play]);

  return (
    <div className="relative pr-12 sm:pr-16">
      <OceanDepth ratio={depth / MAX_DEPTH} />
      {phase !== "intro" && phase !== "loading" ? <DepthMeter depth={depth} maxDepth={MAX_DEPTH} /> : null}

      {phase === "loading" ? <LoadingPanel /> : null}
      {phase === "error" ? <ErrorPanel message={run.error} onRetry={run.begin} /> : null}

      {phase === "intro" ? (
        <DailyIntro resuming={Boolean(state && state.index > 0)} index={state?.index ?? 0} onStart={run.begin} />
      ) : null}

      {(phase === "playing" || phase === "submitting") && state?.prompt ? (
        <div className="pt-6">
          <PromptCard text={state.prompt.text} category={state.prompt.category} label={`Prompt ${state.index + 1} of ${DAILY.promptCount}`} />
          <div className="mt-8">
            <TimerBar msLeft={msLeft} totalMs={DAILY.secondsPerPrompt * 1000} label="Time" onFinalSeconds={onFinalSeconds} />
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
        </div>
      ) : null}

      {phase === "reveal" && reveal ? (
        <RevealCard
          reveal={reveal}
          continueLabel={isLast ? "See my dive" : "Next prompt"}
          onContinue={() => (isLast ? run.finish() : void run.next())}
        />
      ) : null}

      {phase === "finished" && state ? <DailySummary state={state} auth={run.auth.current} /> : null}
    </div>
  );
}

function DailyIntro({ resuming, index, onStart }: { resuming: boolean; index: number; onStart: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <section className="mx-auto max-w-xl pt-10 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black sm:text-5xl">Daily Dive</h1>
      <p className="mt-4 text-lg text-mist">
        {DAILY.promptCount} prompts. {DAILY.secondsPerPrompt} seconds each. Everyone gets the same ones today.
        The rarer your answer, the deeper you go.
      </p>
      <button
        ref={button}
        type="button"
        onClick={onStart}
        className="mt-8 min-h-14 rounded-2xl bg-glow px-10 text-lg font-bold text-abyss hover:brightness-110"
      >
        {resuming ? `Continue from prompt ${index + 1}` : "Start today’s dive"}
      </button>
      <p className="mt-4 text-sm text-mist">The timer starts when each prompt appears. Reveals are untimed.</p>
    </section>
  );
}

function DailySummary({ state, auth }: { state: NonNullable<ReturnType<typeof useRun>["state"]>; auth: ReturnType<typeof useRun>["auth"]["current"] }) {
  const { play } = useSound();
  const tiers = useMemo(() => state.results.map((r) => r.tier), [state.results]);
  const band = bandForDepth(state.depth);
  const [streak, setStreak] = useState(0);
  const celebrated = useRef(false);

  useEffect(() => {
    saveDailyRecord(state.date, { depth: state.depth, score: state.score, tiers });
    setStreak(currentStreak(state.date));
    if (!celebrated.current) {
      celebrated.current = true;
      play("finish");
    }
  }, [state.date, state.depth, state.score, tiers, play]);

  const text = shareText(state.date, state.depth, tiers, streak);
  return (
    <section className="glass animate-pop mx-auto mt-6 max-w-xl rounded-3xl p-6 text-center sm:p-8" aria-labelledby="summary-title">
      <p className="text-sm uppercase tracking-[0.25em] text-glow">Today’s dive</p>
      <h1 id="summary-title" className="mt-2 font-[family-name:var(--font-display)] text-6xl font-black tabular-nums">
        {state.depth.toLocaleString("en-GB")}m
      </h1>
      <p className="mt-3 text-4xl" aria-hidden="true">{band.emoji}</p>
      <h2 className="text-2xl font-bold">{band.name}</h2>
      <p className="mt-1 text-mist">{band.description}</p>

      <p className="mt-6 text-2xl tracking-wider" aria-label={`Tiers: ${tiers.map((t) => TIERS[t as TierId].name).join(", ")}`}>
        {tiers.map((t) => TIERS[t as TierId].emoji).join("")}
      </p>
      <p className="mt-2 text-mist">
        {state.score} points · {streak > 0 ? `🔥 ${streak} day streak` : "Start a streak tomorrow"}
      </p>

      <ol className="mt-6 space-y-2 text-left text-sm">
        {state.results.map((r, i) => (
          <li key={r.promptId} className="rounded-xl bg-white/5 px-3 py-2">
            <span className="text-mist">{i + 1}. {r.promptText}</span>
            <span className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
              <strong>{r.canonical ?? (r.answer || "No answer")}</strong>
              <span className="text-xs font-semibold" style={{ color: TIERS[r.tier as TierId].color }}>
                {TIERS[r.tier as TierId].emoji} {TIERS[r.tier as TierId].name} · {r.depth}m
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col items-center gap-3">
        <CopyButton text={text} label="Copy share summary" />
        <pre className="w-full overflow-x-auto rounded-xl bg-black/30 p-3 text-left text-xs text-mist">{text}</pre>
        <NameForm auth={auth} initialName={state.name} />
        <p className="text-sm text-mist">A new dive opens at midnight UTC. Meanwhile, try <Link className="underline" href="/play/infinite">Infinite Dive</Link>.</p>
      </div>
    </section>
  );
}
