import type { Metadata } from "next";
import { getLeaderboard, type LeaderboardRow } from "@/lib/game/leaderboard";
import { ButtonLink } from "@/components/ui/ButtonLink";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "The deepest divers in Infinite Dive and today’s Daily Dive.",
  alternates: { canonical: "/leaderboard" },
};

// Always read fresh scores (and never touch the database at build time).
export const dynamic = "force-dynamic";

function Board({ title, rows, empty }: { title: string; rows: LeaderboardRow[]; empty: string }) {
  return (
    <section aria-labelledby={title} className="glass rounded-3xl p-5">
      <h2 id={title} className="text-2xl font-black">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-mist">{empty}</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="text-xs uppercase tracking-wider text-mist">
            <tr>
              <th scope="col" className="py-2">#</th>
              <th scope="col">Diver</th>
              <th scope="col" className="text-right">Depth</th>
              <th scope="col" className="text-right">Prompts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.rank}-${r.name}`} className="border-t border-white/10">
                <td className="py-2 font-mono">{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</td>
                <td className="font-semibold">{r.name}</td>
                <td className="text-right font-mono">{r.depth.toLocaleString("en-GB")}m</td>
                <td className="text-right font-mono">{r.prompts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function LeaderboardPage() {
  const [infinite, daily] = await Promise.all([
    getLeaderboard("infinite").catch(() => []),
    getLeaderboard("daily").catch(() => []),
  ]);
  return (
    <div className="pt-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-black sm:text-5xl">Leaderboard</h1>
      <p className="mt-3 text-mist">Finish a run and add your name to appear here. Your personal bests live on the game screens.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Board title="Infinite Dive: all time" rows={infinite} empty="Nobody has surfaced yet. Be the first!" />
        <Board title="Daily Dive: today" rows={daily} empty="No finished dives today yet." />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/play/infinite">Play Infinite</ButtonLink>
        <ButtonLink href="/play/daily" variant="secondary">Play Daily</ButtonLink>
      </div>
    </div>
  );
}
