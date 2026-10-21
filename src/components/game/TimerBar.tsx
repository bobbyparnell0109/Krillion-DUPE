"use client";

/**
 * A horizontal timer/air bar with screen-reader announcements at key moments.
 */
import { useEffect, useRef, useState } from "react";

interface Props {
  msLeft: number;
  totalMs: number;
  label: string;
  /** Called once per second in the final five seconds (for tick sounds). */
  onFinalSeconds?: () => void;
}

export function TimerBar({ msLeft, totalMs, label, onFinalSeconds }: Props) {
  const seconds = Math.ceil(msLeft / 1000);
  const pct = Math.max(0, Math.min(100, (msLeft / totalMs) * 100));
  const [announce, setAnnounce] = useState("");
  const lastSecond = useRef(seconds);

  useEffect(() => {
    if (seconds === lastSecond.current) return;
    lastSecond.current = seconds;
    if (seconds === 10 || seconds === 5) setAnnounce(`${seconds} seconds left`);
    if (seconds > 0 && seconds <= 5) onFinalSeconds?.();
  }, [seconds, onFinalSeconds]);

  const urgent = seconds <= 5;
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-1 flex justify-between text-sm text-mist">
        <span>{label}</span>
        <span className={`font-mono font-bold tabular-nums ${urgent ? "text-coral" : "text-foam"}`}>{seconds}s</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(totalMs / 1000)}
        aria-valuenow={seconds}
        className="h-3 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-coral" : "bg-glow"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="sr-only" aria-live="assertive">{announce}</p>
    </div>
  );
}
