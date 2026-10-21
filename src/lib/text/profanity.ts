/**
 * Basic profanity filter. Deliberately small and conservative: it is a speed bump for
 * leaderboard names and unmatched answers, not a moderation system.
 */
import { stripAccents } from "./normalize";

// Stored reversed so the source stays readable in code review.
/** Blocked anywhere inside the text (after squashing spaces and punctuation). */
const SUBSTRING_REVERSED = [
  "kcuf", "tihs", "hctib", "sinep", "anigav", "tuls", "erohw", "reggin", "aggin", "toggaf",
  "ekik", "kcabtew", "dratsab", "tihsllub", "nrop", "reknaw", "skcollob", "drater", "elohssa",
  "tawt", "zzij", "tnuc",
];
/** Blocked only as a whole word, so "peacock", "Essex" and "grapes" survive. */
const WHOLE_WORD_REVERSED = [
  "ssa", "esra", "kcoc", "kcid", "ssip", "gaf", "ekyd", "cips", "knihc", "xes", "epar", "izan",
  "reltih", "tit", "stit", "knaw", "muc", "eoh",
];

const reverse = (w: string) => w.split("").reverse().join("");
const SUBSTRING = SUBSTRING_REVERSED.map(reverse);
const WHOLE_WORD = new Set(WHOLE_WORD_REVERSED.map(reverse));
/** Innocent words that contain a blocked substring. */
const ALLOWED_CONTAINING = ["scunthorpe", "shitake", "shiitake", "cockpit", "therapist", "pennistone"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", $: "s", "!": "i" };

function deLeet(input: string): string {
  return stripAccents(input.toLowerCase())
    .split("")
    .map((ch) => LEET[ch] ?? ch)
    .join("");
}

/** True if the text contains a blocked word. */
export function isProfane(input: string): boolean {
  const cleaned = deLeet(input);
  const words = cleaned.replace(/[^a-z]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.some((w) => WHOLE_WORD.has(w))) return true;
  const chunks = [...words];
  // Spaced-out evasion ("f u c k", "f.u.c.k"): also check the letters squashed together.
  if (words.filter((w) => w.length === 1).length >= 3) chunks.push(words.join(""));
  return chunks.some((chunk) => {
    let c = chunk.replace(/(.)\1{2,}/g, "$1$1");
    for (const ok of ALLOWED_CONTAINING) c = c.split(ok).join("");
    return SUBSTRING.some((bad) => c.includes(bad));
  });
}
