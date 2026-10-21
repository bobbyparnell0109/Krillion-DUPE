import Link from "next/link";
import { db } from "@/lib/db";
import { aiAvailable, AI_MODEL } from "@/lib/ai/client";
import { UNPLAYED_TARGET } from "@/lib/bank/pipeline";
import { generateNow } from "../actions";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs uppercase tracking-wider text-mist">{label}</p>
      <p className="mt-1 font-mono text-3xl font-bold">{typeof value === "number" ? value.toLocaleString("en-GB") : value}</p>
      {hint ? <p className="mt-1 text-xs text-mist">{hint}</p> : null}
    </div>
  );
}

export default async function AdminHome() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [prompts, active, unplayed, answers, subs24, valid24, pending, runs24, finished, cats] = await Promise.all([
    db.prompt.count(),
    db.prompt.count({ where: { status: "active" } }),
    db.prompt.count({ where: { status: "active", timesServed: 0 } }),
    db.answer.count(),
    db.submission.count({ where: { createdAt: { gte: since } } }),
    db.submission.count({ where: { createdAt: { gte: since }, valid: true } }),
    db.reviewItem.count({ where: { status: "pending" } }),
    db.run.count({ where: { createdAt: { gte: since } } }),
    db.run.count({ where: { status: "finished" } }),
    db.prompt.groupBy({ by: ["category"], _count: { _all: true }, orderBy: { category: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black">Stats</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Prompts" value={prompts} hint={`${active} active`} />
        <Stat label="Unplayed" value={unplayed} hint={`Cron tops up below ${UNPLAYED_TARGET}`} />
        <Stat label="Answers" value={answers} />
        <Stat label="Review queue" value={pending} hint="pending" />
        <Stat label="Submissions (24h)" value={subs24} hint={subs24 ? `${Math.round((valid24 / subs24) * 100)}% valid` : undefined} />
        <Stat label="Runs started (24h)" value={runs24} />
        <Stat label="Runs finished" value={finished} hint="all time" />
        <Stat label="AI" value={aiAvailable() ? "On" : "Off"} hint={aiAvailable() ? AI_MODEL : "Set ANTHROPIC_API_KEY"} />
      </div>

      <section className="glass rounded-2xl p-5">
        <h2 className="text-xl font-bold">Generate prompts now</h2>
        <p className="mt-1 text-sm text-mist">
          Runs the full pipeline (generate, quality filter, de-duplicate, answers). For bulk seeding use <code>npm run seed:ai</code>.
          {pending > 0 ? <> There are <Link className="underline" href="/admin/review">{pending} answers to review</Link>.</> : null}
        </p>
        <form action={generateNow} className="mt-3 flex items-center gap-2">
          <label htmlFor="count" className="text-sm">How many</label>
          <input id="count" name="count" type="number" min={1} max={10} defaultValue={5} className="glass w-20 rounded-lg px-2 py-1" />
          <button type="submit" disabled={!aiAvailable()} className="rounded-xl bg-glow px-4 py-2 font-bold text-abyss disabled:opacity-40">
            Generate
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-bold">Prompts by category</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {cats.map((c) => (
            <li key={c.category} className="flex justify-between rounded-lg bg-white/5 px-3 py-1.5">
              <span>{c.category}</span>
              <span className="font-mono">{c._count._all}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
