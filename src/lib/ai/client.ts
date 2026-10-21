/**
 * Anthropic client wrapper. Server only: importing this from a client component fails
 * the build, so the API key can never reach the browser.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 3 });
  return client;
}

export class AiError extends Error {}

interface JsonCallOptions<T extends z.ZodType> {
  system: string;
  user: string;
  schema: T;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}

/**
 * One structured-output call. Streams (large answer lists can be long), validates the
 * JSON against the Zod schema and returns the typed result.
 *
 * Server-side refusal fallbacks are enabled (`fallbacks: "default"`) so a rare false
 * positive safety decline is retried on a fallback model instead of failing.
 */
export async function callJson<T extends z.ZodType>(opts: JsonCallOptions<T>): Promise<z.infer<T>> {
  if (!aiAvailable()) throw new AiError("ANTHROPIC_API_KEY is not set");
  const stream = getClient().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new AiError("Model declined the request");
  if (message.stop_reason === "max_tokens") throw new AiError("Output truncated (max_tokens)");
  const parsed = message.parsed_output;
  if (parsed === null || parsed === undefined) throw new AiError("Model returned no parseable JSON");
  return parsed as z.infer<T>;
}
