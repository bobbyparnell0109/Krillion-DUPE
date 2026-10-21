/**
 * JSX for Open Graph images (rendered by next/og, so only inline styles and flexbox).
 * No emoji on purpose: next/og would fetch emoji images from a CDN at render time.
 */
import { SITE } from "@/config/site";
import { TIERS, bandForDepth, type TierId } from "@/config/game";
import type { ShareParams } from "./params";

export const OG_SIZE = { width: 1200, height: 630 };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(180deg, #1474b8 0%, #0b2a55 45%, #020617 100%)",
        color: "#e6f6ff",
        fontFamily: "sans-serif",
        padding: 60,
      }}
    >
      {children}
    </div>
  );
}

export function SiteCard() {
  return (
    <Frame>
      <div style={{ fontSize: 40, letterSpacing: 12, fontWeight: 800, color: "#5eead4" }}>{SITE.name}</div>
      <div style={{ fontSize: 76, fontWeight: 900, marginTop: 30, textAlign: "center", lineHeight: 1.1 }}>Obvious answers float.</div>
      <div style={{ fontSize: 76, fontWeight: 900, color: "#5eead4", textAlign: "center" }}>Rare ones sink deep.</div>
      <div style={{ fontSize: 32, marginTop: 36, color: "#a9c8e0" }}>The daily trivia game where the rarest answer wins</div>
    </Frame>
  );
}

export function ResultCard({ params }: { params: ShareParams }) {
  const band = bandForDepth(params.depth);
  return (
    <Frame>
      <div style={{ fontSize: 34, letterSpacing: 10, fontWeight: 800, color: "#5eead4" }}>
        {`${SITE.name}${params.day ? ` #${params.day}` : ""}`}
      </div>
      <div style={{ fontSize: 150, fontWeight: 900, marginTop: 10 }}>{`${params.depth.toLocaleString("en-GB")}m`}</div>
      <div style={{ fontSize: 56, fontWeight: 800 }}>{band.name}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
        {params.tiers.map((t, i) => (
          <div
            key={i}
            style={{ width: 70, height: 70, borderRadius: 16, background: TIERS[t as TierId].color, display: "flex" }}
          />
        ))}
      </div>
      <div style={{ fontSize: 30, marginTop: 34, color: "#a9c8e0" }}>Can you dive deeper? Play today’s Daily Dive.</div>
    </Frame>
  );
}
