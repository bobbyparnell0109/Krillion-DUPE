import { z } from "zod";
import { LIMITS } from "@/config/game";
import { handle, jsonOk, limitByIp, readBody, zRunAuth } from "@/lib/api";
import { answerPrompt } from "@/lib/game/runs";
import { cleanText } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";
// The AI judge may take a few seconds for unseen answers.
export const maxDuration = 30;

/** Submit an answer for the live prompt. Scored entirely on the server. */
export const POST = handle(async (req) => {
  const ipHash = await limitByIp(req, "answer");
  const body = await readBody(req, zRunAuth.extend({ answer: z.string().max(200).default("") }));
  const answer = cleanText(body.answer, LIMITS.answerMaxLength);
  return jsonOk(await answerPrompt(body.runId, body.token, answer, ipHash));
});
