/**
 * Vertical depth gauge pinned to the side of the screen. Fills downward as you dive.
 */
import { DEPTH_BANDS } from "@/config/game";

export function DepthMeter({ depth, maxDepth }: { depth: number; maxDepth: number }) {
  const pct = Math.min(100, (depth / maxDepth) * 100);
  return (
    <aside
      aria-label={`Depth: ${depth} metres`}
      className="pointer-events-none fixed top-24 right-2 bottom-24 z-10 flex w-10 flex-col items-center sm:right-5 sm:w-14"
    >
      <span className="mb-2 text-[10px] font-semibold tracking-widest text-mist uppercase">Depth</span>
      <div className="relative w-2.5 flex-1 overflow-hidden rounded-full bg-white/10 sm:w-3">
        <div
          className="absolute inset-x-0 top-0 rounded-full bg-gradient-to-b from-glow via-surface to-[#a78bfa] transition-[height] duration-700 ease-out"
          style={{ height: `${pct}%` }}
        />
        {DEPTH_BANDS.slice(1).map((band) =>
          band.min < maxDepth ? (
            <span
              key={band.name}
              title={band.name}
              className="absolute inset-x-0 h-px bg-foam/40"
              style={{ top: `${(band.min / maxDepth) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <span className="mt-2 font-mono text-xs font-bold text-foam tabular-nums">{depth}m</span>
    </aside>
  );
}
