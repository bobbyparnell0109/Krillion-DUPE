import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/security/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="pt-4">
      <nav aria-label="Admin" className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2 text-sm">
        <Link href="/admin" className="rounded-xl px-3 py-2 hover:bg-white/10">Stats</Link>
        <Link href="/admin/review" className="rounded-xl px-3 py-2 hover:bg-white/10">Review queue</Link>
        <Link href="/admin/prompts" className="rounded-xl px-3 py-2 hover:bg-white/10">Prompts</Link>
        <form action="/api/admin/logout" method="post" className="ml-auto">
          <button type="submit" className="rounded-xl px-3 py-2 text-mist hover:bg-white/10">Log out</button>
        </form>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
