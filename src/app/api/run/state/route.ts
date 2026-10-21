import { handle, jsonOk, readBody, zRunAuth } from "@/lib/api";
import { getState } from "@/lib/game/runs";

export const dynamic = "force-dynamic";

/** Current state of a run (used to resume after closing the tab). */
export const POST = handle(async (req) => {
  const { runId, token } = await readBody(req, zRunAuth);
  return jsonOk({ state: await getState(runId, token) });
});
