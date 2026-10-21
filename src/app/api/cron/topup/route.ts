import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { topUp } from "@/lib/bank/pipeline";
import { aiAvailable } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Tops up the prompt bank when fewer than 200 prompts are unplayed.
 * Called by Vercel Cron (see vercel.json) with "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!aiAvailable()) return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
  const log: string[] = [];
  // Stop starting new work ~30s before the function limit.
  const report = await topUp((m) => log.push(m), { maxNew: 30, deadline: Date.now() + 260_000 });
  return NextResponse.json({ ...report, log: log.slice(-100) });
}
