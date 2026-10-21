"use client";

import { useSound } from "./Providers";

export function MuteToggle() {
  const { muted, toggleMute } = useSound();
  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-pressed={muted}
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      title={muted ? "Sound off" : "Sound on"}
      className="rounded-full p-2 text-xl leading-none hover:bg-white/10"
    >
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
