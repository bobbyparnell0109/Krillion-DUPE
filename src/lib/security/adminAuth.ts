/**
 * Minimal admin auth: a single password from ADMIN_PASSWORD, exchanged for an HMAC
 * signed, httpOnly session cookie.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "dd_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

function secret(): string {
  return `${process.env.APP_SECRET ?? "dev"}:${process.env.ADMIN_PASSWORD ?? ""}`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function adminConfigured(): boolean {
  return (process.env.ADMIN_PASSWORD ?? "").length >= 8;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!adminConfigured()) return false;
  // Compare hashes so lengths always match.
  return safeEqual(sign(`pw:${input}`), sign(`pw:${expected}`));
}

export function createSessionValue(): string {
  const expires = String(Date.now() + SESSION_MS);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value || !adminConfigured()) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || !safeEqual(sig, sign(expires))) return false;
  return Number(expires) > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(store.get(ADMIN_COOKIE)?.value);
}

/** Throw if the caller is not an authenticated admin (use in server actions). */
export async function assertAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("Unauthorised");
}

export const SESSION_MAX_AGE_SECONDS = SESSION_MS / 1000;
