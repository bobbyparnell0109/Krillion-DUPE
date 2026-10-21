import { db } from "@/lib/db";
import { approveReview, rejectReview } from "../../actions";

type SearchParams = Promise<{ status?: string }>;

export default async function ReviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { status: raw } = await searchParams;
  const status = ["pending", "approved", "rejected"].includes(raw ?? "") ? raw! : "pending";
  const items = await db.reviewItem.findMany({
    where: { status },
    orderBy: [{ occurrences: "desc" }, { updatedAt: "desc" }],
    take: 100,
    include: { prompt: { select: { text: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Review queue</h1>
        <nav aria-label="Filter" className="flex gap-2 text-sm">
          {["pending", "approved", "rejected"].map((s) => (
            <a key={s} href={`?status=${s}`} aria-current={s === status ? "page" : undefined} className={`rounded-full px-3 py-1 ${s === status ? "bg-foam text-abyss" : "bg-white/10"}`}>
              {s}
            </a>
          ))}
        </nav>
      </div>
      <p className="mt-2 text-sm text-mist">
        Unmatched answers, sorted by how often players gave them. “valid” means the AI accepted it as a new answer
        (approve to confirm, reject to remove it). To map an answer onto an existing one, fill in “map to”.
      </p>
      {items.length === 0 ? <p className="mt-8 text-mist">Nothing here. 🎉</p> : null}
      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="text-mist">{item.prompt.text}:</span> <strong className="text-lg">“{item.raw}”</strong>
              </p>
              <p className="text-xs text-mist">
                ×{item.occurrences} · AI: <span className={item.aiVerdict === "valid" ? "text-kelp" : item.aiVerdict === "invalid" ? "text-coral" : ""}>{item.aiVerdict}</span>
              </p>
            </div>
            {item.aiReason ? <p className="mt-1 text-sm text-mist">{item.aiReason}</p> : null}
            {status === "pending" ? (
              <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
                <form action={approveReview} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <label className="flex flex-col">
                    <span className="text-xs text-mist">Display as</span>
                    <input name="canonical" defaultValue={item.raw} className="glass rounded-lg px-2 py-1" />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs text-mist">or map to existing</span>
                    <input name="mapTo" placeholder="e.g. Golden Gate" className="glass rounded-lg px-2 py-1" />
                  </label>
                  <label className="flex flex-col">
                    <span className="text-xs text-mist">Tier</span>
                    <select name="tier" defaultValue="4" className="glass rounded-lg px-2 py-1">
                      {[1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <button type="submit" className="rounded-lg bg-kelp px-3 py-1.5 font-bold text-abyss">Approve</button>
                </form>
                <form action={rejectReview}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="rounded-lg bg-coral px-3 py-1.5 font-bold text-abyss">Reject</button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
