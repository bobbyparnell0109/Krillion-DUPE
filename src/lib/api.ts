/**
 * Small helpers shared by API route handlers.
 */
import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { RunError } from "@/lib/game/runs";
import { rateLimit, type LimitName } from "@/lib/security/rateLimit";
import { ipHashFrom } from "@/lib/security/ip";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

/** Parse and validate a JSON body (max 32KB). */
export async function readBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  const text = await req.text();
  if (text.length > 32_000) throw new RunError("Request too large", 413);
  let raw: unknown;
  try {
    raw = JSON.parse(text || "{}");
  } catch {
    throw new RunError("Invalid JSON", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new RunError("Invalid request", 400);
  return parsed.data;
}

/** Apply a per-IP rate limit; throws a 429 RunError when exceeded. Returns the IP hash. */
export async function limitByIp(req: Request, name: LimitName): Promise<string> {
  const ipHash = ipHashFrom(req.headers);
  const result = await rateLimit(name, ipHash);
  if (!result.ok) throw new RunError("Slow down a little and try again shortly.", 429);
  return ipHash;
}

/** Wrap a handler so thrown RunErrors become JSON errors and anything else a 500. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof RunError) return jsonError(err.message, err.status);
      console.error(err);
      return jsonError("Something went wrong under the sea. Please try again.", 500);
    }
  };
}

/** Common Zod pieces. */
export const zRunAuth = z.object({
  runId: z.string().min(10).max(40),
  token: z.string().min(16).max(64),
});
export const zPlayerId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
