/**
 * Fuzzy matching of a normalised player answer against a list of normalised keys.
 */
import { compact } from "./normalize";

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions). */
export function editDistance(a: string, b: string, max = Infinity): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2][j - 2] + 1);
      }
      d[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** How many typos we tolerate for a word of this length. Short words must be exact. */
export function allowedTypos(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

export interface FuzzyCandidate {
  key: string;
  id: string;
}

export interface FuzzyHit {
  id: string;
  key: string;
  distance: number;
}

/**
 * Find the closest candidate within the typo budget. Compares both spaced and
 * compact forms. Returns null when nothing is close enough or when two different
 * answers are equally close (ambiguous typo).
 */
export function fuzzyFind(input: string, candidates: FuzzyCandidate[]): FuzzyHit | null {
  const inputCompact = compact(input);
  const budget = allowedTypos(inputCompact.length);
  let best: FuzzyHit | null = null;
  let ambiguous = false;

  for (const c of candidates) {
    const keyCompact = compact(c.key);
    if (keyCompact === inputCompact) return { id: c.id, key: c.key, distance: 0 };
    if (budget === 0) continue;
    // The first letter rarely gets mistyped; requiring it avoids silly matches.
    if (keyCompact[0] !== inputCompact[0]) continue;
    const dist = editDistance(inputCompact, keyCompact, budget);
    if (dist > budget) continue;
    // Keys shorter than 5 letters must match exactly (e.g. "cat" vs "car").
    if (keyCompact.length <= 4) continue;
    if (!best || dist < best.distance) {
      best = { id: c.id, key: c.key, distance: dist };
      ambiguous = false;
    } else if (dist === best.distance && best.id !== c.id) {
      ambiguous = true;
    }
  }
  return ambiguous ? null : best;
}
