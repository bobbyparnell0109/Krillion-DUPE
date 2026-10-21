/**
 * Parsing for share-card query params (?d=depth&t=tiers&n=day). Shared by the share
 * page and the OG image route; everything is clamped so bad input can't break rendering.
 */
import { bandForDepth } from "@/config/game";

export interface ShareParams {
  depth: number;
  tiers: number[];
  day: number | null;
}

export function parseShareParams(get: (key: string) => string | null | undefined): ShareParams {
  const depth = Math.min(99_999, Math.max(0, Math.floor(Number(get("d")) || 0)));
  const tiers = (get("t") ?? "")
    .replace(/[^0-5]/g, "")
    .slice(0, 7)
    .split("")
    .map(Number);
  const dayRaw = Math.floor(Number(get("n")));
  const day = Number.isFinite(dayRaw) && dayRaw > 0 && dayRaw < 100_000 ? dayRaw : null;
  return { depth, tiers, day };
}

export function shareQuery(p: ShareParams): string {
  const q = new URLSearchParams({ d: String(p.depth), t: p.tiers.join("") });
  if (p.day) q.set("n", String(p.day));
  return q.toString();
}

export function shareHeadline(p: ShareParams): string {
  const band = bandForDepth(p.depth);
  return `${p.depth.toLocaleString("en-GB")}m · ${band.name}`;
}
