import { NextResponse } from "next/server";
import { ADMIN_COOKIE, SESSION_MAX_AGE_SECONDS, checkPassword, createSessionValue } from "@/lib/security/adminAuth";
import { rateLimit } from "@/lib/security/rateLimit";
import { ipHashFrom } from "@/lib/security/ip";

export const dynamic = "force-dynamic";

/** Form POST from /admin/login. Redirects back with ?error on failure. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const limited = await rateLimit("adminLogin", ipHashFrom(req.headers));
  if (!limited.ok) return NextResponse.redirect(new URL("/admin/login?error=rate", url), 303);

  const form = await req.formData();
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!checkPassword(password)) return NextResponse.redirect(new URL("/admin/login?error=1", url), 303);

  const res = NextResponse.redirect(new URL("/admin", url), 303);
  res.cookies.set(ADMIN_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}
