"use client";

/**
 * Fixed full-screen ocean: gradient darkens with depth, bubbles rise (unless the user
 * prefers reduced motion, handled in CSS).
 */
import { useEffect, useMemo } from "react";
import { useOcean } from "@/components/layout/Providers";

/** Deterministic pseudo-random so server and client render the same bubbles. */
function bubbleSpecs(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => ((Math.sin(i * 9301 + n * 49297) + 1) / 2) % 1;
    return {
      left: `${Math.round(r(1) * 100)}%`,
      size: 6 + Math.round(r(2) * 18),
      duration: 9 + Math.round(r(3) * 14),
      delay: -Math.round(r(4) * 20),
    };
  });
}

export function OceanBackdrop() {
  const { depthRatio } = useOcean();
  const bubbles = useMemo(() => bubbleSpecs(18), []);

  useEffect(() => {
    document.documentElement.style.setProperty("--depth", depthRatio.toFixed(3));
  }, [depthRatio]);

  return (
    <div className="ocean" aria-hidden="true">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{ left: b.left, width: b.size, height: b.size, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
        />
      ))}
    </div>
  );
}

/** Drop into a page to set the ocean depth while it is mounted. */
export function OceanDepth({ ratio }: { ratio: number }) {
  const { setDepthRatio } = useOcean();
  useEffect(() => {
    setDepthRatio(ratio);
  }, [ratio, setDepthRatio]);
  useEffect(() => () => setDepthRatio(0), [setDepthRatio]);
  return null;
}
