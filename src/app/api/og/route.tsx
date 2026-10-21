import { ImageResponse } from "next/og";
import { OG_SIZE, ResultCard } from "@/lib/share/card";
import { parseShareParams } from "@/lib/share/params";

/** Share card image for a Daily Dive result: /api/og?d=1240&t=1243051&n=12 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = parseShareParams((k) => url.searchParams.get(k));
  return new ImageResponse(<ResultCard params={params} />, {
    ...OG_SIZE,
    headers: { "Cache-Control": "public, max-age=86400, immutable" },
  });
}
