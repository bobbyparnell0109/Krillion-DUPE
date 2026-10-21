import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { TIERS, bandForDepth, type TierId } from "@/config/game";
import { parseShareParams, shareHeadline, shareQuery } from "@/lib/share/params";
import { ButtonLink } from "@/components/ui/ButtonLink";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getter(sp: Record<string, string | string[] | undefined>) {
  return (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = parseShareParams(getter(await searchParams));
  const title = `${shareHeadline(params)} on ${SITE.name}${params.day ? ` #${params.day}` : ""}`;
  const image = `/api/og?${shareQuery(params)}`;
  return {
    title,
    description: "Can you find rarer answers? Play today’s Daily Dive.",
    robots: { index: false },
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function SharePage({ searchParams }: { searchParams: SearchParams }) {
  const params = parseShareParams(getter(await searchParams));
  const band = bandForDepth(params.depth);
  return (
    <section className="mx-auto max-w-xl pt-10 text-center">
      <p className="text-sm uppercase tracking-[0.25em] text-glow">
        {SITE.name}
        {params.day ? ` #${params.day}` : ""}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-6xl font-black">{params.depth.toLocaleString("en-GB")}m</h1>
      <p className="mt-3 text-4xl" aria-hidden="true">{band.emoji}</p>
      <p className="text-2xl font-bold">{band.name}</p>
      <p className="mt-4 text-3xl tracking-widest" aria-label="Tier results">
        {params.tiers.map((t) => TIERS[t as TierId].emoji).join("")}
      </p>
      <p className="mt-6 text-mist">A friend dived this deep. Can you find rarer answers?</p>
      <div className="mt-8">
        <ButtonLink href="/play/daily">Play today’s dive</ButtonLink>
      </div>
    </section>
  );
}
