"use client";

/**
 * App-wide client state: sound (mute toggle) and ocean depth (drives the background).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { playSound, type SoundName } from "@/lib/client/sound";
import { KEYS, readJson, writeJson } from "@/lib/client/storage";

interface SoundCtx {
  muted: boolean;
  toggleMute: () => void;
  play: (name: SoundName) => void;
}

interface OceanCtx {
  /** 0 = surface, 1 = deepest trench. */
  depthRatio: number;
  setDepthRatio: (ratio: number) => void;
}

const SoundContext = createContext<SoundCtx>({ muted: true, toggleMute: () => {}, play: () => {} });
const OceanContext = createContext<OceanCtx>({ depthRatio: 0, setDepthRatio: () => {} });

export function Providers({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);
  const [depthRatio, setDepthRatioState] = useState(0);

  useEffect(() => setMuted(readJson<boolean>(KEYS.muted, false)), []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      writeJson(KEYS.muted, !m);
      return !m;
    });
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!muted) playSound(name);
    },
    [muted],
  );

  const setDepthRatio = useCallback((ratio: number) => setDepthRatioState(Math.min(1, Math.max(0, ratio))), []);

  const sound = useMemo(() => ({ muted, toggleMute, play }), [muted, toggleMute, play]);
  const ocean = useMemo(() => ({ depthRatio, setDepthRatio }), [depthRatio, setDepthRatio]);

  return (
    <SoundContext.Provider value={sound}>
      <OceanContext.Provider value={ocean}>{children}</OceanContext.Provider>
    </SoundContext.Provider>
  );
}

export const useSound = () => useContext(SoundContext);
export const useOcean = () => useContext(OceanContext);
