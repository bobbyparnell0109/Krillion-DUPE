/**
 * Prompt de-duplication. Anthropic has no embeddings endpoint, so we use a cheap
 * "semantic-ish" similarity on stemmed content words with synonym folding, which
 * catches rephrasings like "Name a kind of bridge" vs "Name a type of bridge".
 */
import { normalizeAnswer, singularize } from "./normalize";

/** Filler words that carry no meaning in a "Name a ___" prompt. */
const STOP = new Set([
  "name", "a", "an", "the", "of", "type", "kind", "sort", "something", "thing", "that", "which",
  "you", "your", "can", "could", "might", "would", "find", "found", "in", "on", "at", "for",
  "to", "with", "is", "are", "be", "or", "and", "any", "famous", "well", "known", "popular",
  "common", "one", "word", "variety", "example", "person", "people", "someone", "who", "has",
  "have", "had", "by", "from", "it", "its", "as", "into", "use", "used",
]);

/** Fold near-synonyms onto one stem so rephrasings collide. */
const FOLD: Record<string, string> = {
  film: "movie", flick: "movie", picture: "movie", show: "tv", programme: "tv", program: "tv",
  television: "tv", song: "track", tune: "track", automobile: "car", vehicle: "car",
  nation: "country", state: "country", town: "city", metropolis: "city", creature: "animal",
  beast: "animal", dish: "food", meal: "food", drink: "beverage", tool: "tool", instrument: "instrument",
  footballer: "soccer", football: "soccer", pupil: "student", hue: "color", shade: "color",
  author: "writer", novelist: "writer", painter: "artist", band: "group", singer: "musician",
};

/** Normalise and reduce a prompt to its meaningful stems. */
export function promptTokens(text: string): string[] {
  const words = normalizeAnswer(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (const raw of words) {
    if (STOP.has(raw)) continue;
    const w = FOLD[raw] ?? singularize(raw);
    // Crude stemming: strip common suffixes on longer words.
    const stem = w.length > 5 ? w.replace(/(ing|ed|er|ly|ian|ish|al)$/, "") : w;
    out.add(stem);
  }
  return [...out];
}

/** Stable signature (sorted stems) stored on each prompt. */
export function promptSignature(text: string): string {
  return promptTokens(text).sort().join(" ");
}

/**
 * Similarity in [0, 1]: the max of Jaccard and containment, so a prompt that adds
 * one qualifier to another ("Name a red fruit" vs "Name a fruit") still scores high.
 */
export function signatureSimilarity(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(Boolean));
  const B = new Set(b.split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const jaccard = inter / (A.size + B.size - inter);
  const containment = inter / Math.min(A.size, B.size);
  // Containment alone is too eager for one-word prompts, so damp it.
  return Math.max(jaccard, containment * (Math.min(A.size, B.size) > 1 ? 0.85 : 0.7));
}

export const DUPLICATE_THRESHOLD = 0.6;

/** Returns the most similar existing signature if it crosses the duplicate threshold. */
export function findDuplicate(signature: string, existing: Iterable<string>): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const other of existing) {
    const score = signatureSimilarity(signature, other);
    if (score > bestScore) {
      bestScore = score;
      best = other;
    }
  }
  return bestScore >= DUPLICATE_THRESHOLD ? best : null;
}
