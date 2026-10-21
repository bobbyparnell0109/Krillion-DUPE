import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { rarityFor } from "@/lib/game/rarity";
import { TIERS } from "@/config/game";
import { addAnswer, deleteAnswer, setAnswerTier, setPromptStatus, updatePromptText } from "../../../actions";

type Params = Promise<{ id: string }>;

export default async function PromptDetail({ params }: { params: Params }) {
  const { id } = await params;
  const prompt = await db.prompt.findUnique({
    where: { id },
    include: { answers: { include: { aliases: { select: { normalized: true } } }, orderBy: [{ count: "desc" }, { priorTier: "asc" }] } },
  });
  if (!prompt) notFound();

  return (
    <div className="space-y-6">
      <form action={updatePromptText} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={prompt.id} />
        <label htmlFor="text" className="sr-only">Prompt text</label>
        <input id="text" name="text" defaultValue={prompt.text} className="glass flex-1 rounded-xl px-3 py-2 text-xl font-bold" />
        <button type="submit" className="rounded-xl bg-foam px-4 font-bold text-abyss">Save text</button>
      </form>
      <p className="text-sm text-mist">
        {prompt.category} · {prompt.difficulty} · breadth {prompt.breadth} · source {prompt.source} · served {prompt.timesServed} ·{" "}
        {prompt.totalSubmissions} plays ({prompt.validSubmissions} valid)
      </p>
      <form action={setPromptStatus}>
        <input type="hidden" name="id" value={prompt.id} />
        <input type="hidden" name="status" value={prompt.status === "active" ? "retired" : "active"} />
        <button type="submit" className={`rounded-xl px-4 py-2 font-bold text-abyss ${prompt.status === "active" ? "bg-coral" : "bg-kelp"}`}>
          {prompt.status === "active" ? "Retire prompt" : "Reactivate prompt"}
        </button>
      </form>

      <section className="glass rounded-2xl p-4">
        <h2 className="font-bold">Add answer</h2>
        <form action={addAnswer} className="mt-2 flex flex-wrap gap-2">
          <input type="hidden" name="promptId" value={prompt.id} />
          <label htmlFor="new-answer" className="sr-only">Answer</label>
          <input id="new-answer" name="canonical" required placeholder="Answer" className="glass flex-1 rounded-lg px-2 py-1" />
          <label htmlFor="new-tier" className="sr-only">Prior tier</label>
          <select id="new-tier" name="tier" defaultValue="3" className="glass rounded-lg px-2 py-1">
            {[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>Tier {t}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-glow px-3 py-1 font-bold text-abyss">Add</button>
        </form>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="text-left text-mist">{prompt.answers.length} answers. “Live tier” is what a first-time answer would score right now.</caption>
          <thead className="text-xs uppercase tracking-wider text-mist">
            <tr>
              <th scope="col" className="py-2">Answer</th>
              <th scope="col">Aliases</th>
              <th scope="col" className="text-right">Count</th>
              <th scope="col">Live tier</th>
              <th scope="col">Prior</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {prompt.answers.map((a) => {
              const live = rarityFor(prompt.answers, a.id, a.count).tier;
              return (
                <tr key={a.id} className="border-t border-white/10">
                  <td className="py-1.5 font-semibold">{a.canonical} <span className="text-xs text-mist">({a.source})</span></td>
                  <td className="text-xs text-mist">{a.aliases.map((x) => x.normalized).join(", ")}</td>
                  <td className="text-right font-mono">{a.count}</td>
                  <td style={{ color: TIERS[live].color }}>{TIERS[live].name}</td>
                  <td>
                    <form action={setAnswerTier} className="flex gap-1">
                      <input type="hidden" name="id" value={a.id} />
                      <select name="tier" defaultValue={a.priorTier} aria-label={`Prior tier for ${a.canonical}`} className="glass rounded px-1">
                        {[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button type="submit" className="rounded bg-white/10 px-2">Set</button>
                    </form>
                  </td>
                  <td>
                    <form action={deleteAnswer}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="rounded bg-coral/80 px-2 text-abyss" aria-label={`Delete ${a.canonical}`}>Delete</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
