import Link from "next/link";
import { db } from "@/lib/db";

type SearchParams = Promise<{ q?: string; page?: string }>;
const PAGE_SIZE = 50;

export default async function PromptsPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const where = q ? { text: { contains: q.slice(0, 60) } } : {};
  const [total, prompts] = await Promise.all([
    db.prompt.count({ where }),
    db.prompt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, text: true, category: true, difficulty: true, status: true, timesServed: true, totalSubmissions: true, _count: { select: { answers: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-3xl font-black">Prompts <span className="text-lg text-mist">({total})</span></h1>
      <form className="mt-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search prompts</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search prompt text" className="glass flex-1 rounded-xl px-3 py-2" />
        <button type="submit" className="rounded-xl bg-foam px-4 font-bold text-abyss">Search</button>
      </form>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-mist">
            <tr>
              <th scope="col" className="py-2">Prompt</th>
              <th scope="col">Category</th>
              <th scope="col">Difficulty</th>
              <th scope="col" className="text-right">Answers</th>
              <th scope="col" className="text-right">Served</th>
              <th scope="col" className="text-right">Plays</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {prompts.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="py-2"><Link className="underline" href={`/admin/prompts/${p.id}`}>{p.text}</Link></td>
                <td>{p.category}</td>
                <td>{p.difficulty}</td>
                <td className="text-right font-mono">{p._count.answers}</td>
                <td className="text-right font-mono">{p.timesServed}</td>
                <td className="text-right font-mono">{p.totalSubmissions}</td>
                <td className={p.status === "active" ? "text-kelp" : "text-coral"}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Pagination" className="mt-4 flex gap-3 text-sm">
        {pageNum > 1 ? <Link href={`?q=${encodeURIComponent(q)}&page=${pageNum - 1}`} className="underline">Previous</Link> : null}
        <span className="text-mist">Page {pageNum} of {pages}</span>
        {pageNum < pages ? <Link href={`?q=${encodeURIComponent(q)}&page=${pageNum + 1}`} className="underline">Next</Link> : null}
      </nav>
    </div>
  );
}
