import type { Metadata } from "next";
import { adminConfigured } from "@/lib/security/adminAuth";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function AdminLogin({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  return (
    <section className="glass mx-auto mt-10 max-w-sm rounded-3xl p-6">
      <h1 className="text-2xl font-black">Admin</h1>
      {!adminConfigured() ? (
        <p className="mt-3 text-coral">Set ADMIN_PASSWORD (8+ characters) in the environment to enable admin.</p>
      ) : (
        <form action="/api/admin/login" method="post" className="mt-4 flex flex-col gap-3">
          <label htmlFor="password" className="text-sm text-mist">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="glass min-h-12 rounded-xl px-3" />
          {error ? (
            <p role="alert" className="text-sm text-coral">
              {error === "rate" ? "Too many attempts. Try again later." : "Wrong password."}
            </p>
          ) : null}
          <button type="submit" className="min-h-12 rounded-xl bg-glow font-bold text-abyss">Log in</button>
        </form>
      )}
    </section>
  );
}
