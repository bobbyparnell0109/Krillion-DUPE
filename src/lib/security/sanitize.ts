/**
 * Input sanitising helpers. React escapes output, so these focus on keeping stored data
 * small, printable and free of control / bidi characters.
 */

// Control chars, zero-width and bidi override characters.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;

export function cleanText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  return input.replace(UNSAFE, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Leaderboard names: letters, digits, spaces and a little punctuation only. */
export function cleanName(input: unknown, maxLength: number): string {
  return cleanText(input, maxLength * 2)
    .replace(/[^\p{L}\p{N} ._-]/gu, "")
    .trim()
    .slice(0, maxLength);
}

/** Opaque client ids we generate ourselves (uuid-ish). */
export function cleanId(input: unknown): string {
  if (typeof input !== "string") return "";
  return /^[A-Za-z0-9_-]{8,64}$/.test(input) ? input : "";
}
