/**
 * Client IP extraction and salted hashing. We never store raw IP addresses.
 */
import { createHash } from "crypto";

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}

export function hashIp(ip: string): string {
  const salt = process.env.APP_SECRET ?? "deepdive-dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function ipHashFrom(headers: Headers): string {
  return hashIp(clientIp(headers));
}
