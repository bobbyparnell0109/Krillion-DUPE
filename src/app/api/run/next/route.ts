import { handle, jsonOk, readBody, zRunAuth } from "@/lib/api";
import { nextPrompt } from "@/lib/game/runs";

export const dynamic = "force-dynamic";

/** Issue the next prompt for a run (starts its clock). */
export const POST = handle(async (req) => {
  const { runId, token } = await readBody(req, zRunAuth);
  return jsonOk({ state: await nextPrompt(runId, token) });
});
