"use client";

/**
 * Post-answer reveal: tier, points, depth gained and how many players said the same.
 */
import { useEffect, useRef } from "react";
import { TIERS } from "@/config/game";
import type { Reveal } from "@/lib/client/api";

interface Props {
  reveal: Reveal;
  onContinue: () => void;
  continueLabel: string;
  /** Infinite mode shows the air bonus. */
  showAir?: boolean;
}

function percentText(reveal: Reveal): string {
  if (!reveal.valid) return "";
  const pct = reveal.percent < 0.1 ? "under 0.1" : reveal.percent.toFixed(reveal.percent < 10 ? 1 : 0);
  return reveal.estimated
    ? `An estimated ${pct}% of players give this answer.`
    : `${pct}% of players gave this answer.`;
}

export function RevealCard({ reveal, onContinue, continueLabel, showAir }: Props) {
  const tier = TIERS[reveal.tier];
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Move focus so Enter continues, and screen readers land on the result.
    button.current?.focus();
  }, [reveal]);

  const legendary = reveal.tier === 5;
  return (
    <section
      aria-live="polite"
      aria-label="Answer result"
      className={`glass mx-auto mt-8 w-full max-w-xl rounded-3xl p-6 text-center sm:p-8 ${reveal.valid ? "animate-pop" : "animate-shake"}`}
      style={{ borderColor: `${tier.color}88`, boxShadow: `0 0 60px -20px ${tier.color}` }}
    >
      <p className="text-sm text-mist">
        You said <strong className="text-foam">“{reveal.answer || "nothing"}”</strong>
        {reveal.canonical && reveal.canonical.toLowerCase() !== reveal.answer.toLowerCase() ? (
          <> → <strong className="text-foam">{reveal.canonical}</strong></>
        ) : null}
      </p>
      <p className="mt-4 text-5xl" aria-hidden="true">{tier.emoji}</p>
      <h2
        className={`mt-2 font-[family-name:var(--font-display)] text-4xl font-black ${legendary ? "legendary" : ""}`}
        style={legendary ? undefined : { color: tier.color }}
      >
        {tier.name}
      </h2>
      <p className="mt-1 text-mist">{reveal.note ?? tier.blurb}</p>

      {reveal.valid ? (
        <dl className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wider text-mist">Points</dt>
            <dd className="font-mono text-2xl font-bold">+{reveal.points}</dd>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wider text-mist">Depth</dt>
            <dd className="font-mono text-2xl font-bold">+{reveal.depth}m</dd>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <dt className="text-xs uppercase tracking-wider text-mist">{showAir ? "Air" : "Rarity"}</dt>
            <dd className="font-mono text-2xl font-bold">
              {showAir ? `+${reveal.airBonus}s` : `${reveal.tier}/5`}
            </dd>
          </div>
        </dl>
      ) : null}
      <p className="mt-4 text-sm text-mist">{percentText(reveal)}</p>
      {reveal.topAnswers.length > 0 ? (
        <p className="mt-2 text-sm text-mist">
          Most common: <span className="text-foam">{reveal.topAnswers.join(", ")}</span>
        </p>
      ) : null}

      <button
        ref={button}
        type="button"
        onClick={onContinue}
        className="mt-6 min-h-12 w-full rounded-2xl bg-foam px-6 text-lg font-bold text-abyss hover:brightness-95"
      >
        {continueLabel}
      </button>
    </section>
  );
}
