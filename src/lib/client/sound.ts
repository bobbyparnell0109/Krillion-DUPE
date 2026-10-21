/**
 * Tiny Web Audio synth for game sound effects. No audio files to download.
 */
"use client";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  endFreq?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, endFreq, duration, type = "sine", gain = 0.15, delay = 0 }: ToneOptions) {
  const ac = audio();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export type SoundName = "submit" | "bubble" | "tick" | "wrong" | "tier1" | "tier2" | "tier3" | "tier4" | "tier5" | "finish";

/** Rising arpeggios: the rarer the tier, the higher and longer the flourish. */
const ARPEGGIO: Record<number, number[]> = {
  1: [392, 523],
  2: [392, 523, 659],
  3: [440, 554, 659, 880],
  4: [440, 554, 659, 880, 1109],
  5: [523, 659, 784, 1047, 1319, 1568],
};

export function playSound(name: SoundName) {
  switch (name) {
    case "submit":
      tone({ freq: 660, endFreq: 880, duration: 0.08, type: "triangle", gain: 0.08 });
      break;
    case "bubble":
      tone({ freq: 300, endFreq: 900, duration: 0.12, type: "sine", gain: 0.08 });
      break;
    case "tick":
      tone({ freq: 1200, duration: 0.04, type: "square", gain: 0.03 });
      break;
    case "wrong":
      tone({ freq: 220, endFreq: 110, duration: 0.35, type: "sawtooth", gain: 0.07 });
      break;
    case "finish":
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, duration: 0.5, type: "triangle", gain: 0.1, delay: i * 0.12 }));
      break;
    default: {
      const notes = ARPEGGIO[Number(name.slice(4))] ?? ARPEGGIO[1];
      notes.forEach((f, i) => tone({ freq: f, duration: 0.25, type: "triangle", gain: 0.1, delay: i * 0.07 }));
    }
  }
}
