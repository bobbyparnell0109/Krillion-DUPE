import { z } from "zod";
import { INFINITE } from "@/config/game";
import { handle, jsonOk, limitByIp, readBody, zPlayerId } from "@/lib/api";
import { startInfinite } from "@/lib/game/runs";

export const dynamic = "force-dynamic";

/** Start a new Infinite Dive. `excludeIds` are prompts this player has seen recently. */
export const POST = handle(async (req) => {
  const ipHash = await limitByIp(req, "startRun");
  const body = await readBody(
    req,
    z.object({
      playerId: zPlayerId,
      excludeIds: z.array(z.string().max(40)).max(INFINITE.maxExcludeIds * 2).default([]),
    }),
  );
  return jsonOk(await startInfinite(body.playerId, ipHash, body.excludeIds));
});
