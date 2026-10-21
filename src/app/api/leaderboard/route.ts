import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/game/leaderboard";

export const dynamic = "force-dynamic";

/** GET /api/leaderboard?mode=infinite|daily */
export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get("mode") === "daily" ? "daily" : "infinite";
  const rows = await getLeaderboard(mode);
  return NextResponse.json({ mode, rows }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
