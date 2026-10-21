import { z } from "zod";
import { handle, jsonOk, limitByIp, readBody, zPlayerId } from "@/lib/api";
import { startDaily } from "@/lib/game/runs";

export const dynamic = "force-dynamic";

/** Start or resume today's Daily Dive. */
export const POST = handle(async (req) => {
  const ipHash = await limitByIp(req, "startRun");
  const { playerId } = await readBody(req, z.object({ playerId: zPlayerId }));
  return jsonOk(await startDaily(playerId, ipHash));
});
