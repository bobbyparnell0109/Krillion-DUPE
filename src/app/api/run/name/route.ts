import { z } from "zod";
import { LIMITS } from "@/config/game";
import { handle, jsonError, jsonOk, limitByIp, readBody, zRunAuth } from "@/lib/api";
import { nameRun } from "@/lib/game/runs";
import { cleanName } from "@/lib/security/sanitize";
import { isProfane } from "@/lib/text/profanity";

export const dynamic = "force-dynamic";

/** Put a finished run on the global leaderboard under a name. */
export const POST = handle(async (req) => {
  await limitByIp(req, "leaderboard");
  const body = await readBody(req, zRunAuth.extend({ name: z.string().max(64) }));
  const name = cleanName(body.name, LIMITS.nameMaxLength);
  if (name.length < 2) return jsonError("Names need at least 2 letters or numbers.");
  if (isProfane(name)) return jsonError("Please pick a friendlier name.");
  return jsonOk({ state: await nameRun(body.runId, body.token, name) });
});
