import { describe, expect, it } from "vitest";
import { blendedShares, rarityFor, revealPercent } from "./rarity";
import { nextAir, rewardFor } from "./scoring";
import { pickDaily } from "./daily";
import { matchLocal } from "./judge";

function bank(n: number) {
  // A realistic prior: few common answers, long rare tail.
  return Array.from({ length: n }, (_, i) => ({
    id: `a${i}`,
    priorTier: i < 5 ? 1 : i < 20 ? 2 : i < 50 ? 3 : i < 90 ? 4 : 5,
    count: 0,
  }));
}

describe("rarity", () => {
  it("shares sum to 1", () => {
    const shares = blendedShares(bank(120));
    const total = [...shares.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
  });
  it("uses the prior with no data: common answers are Plankton, the tail is deep", () => {
    const answers = bank(120);
    expect(rarityFor(answers, "a0", 0).tier).toBe(1);
    expect(rarityFor(answers, "a119", 0).tier).toBe(5);
    expect(rarityFor(answers, "a119", 3).tier).toBe(4); // given before, so not One in a Million
  });
  it("live data overrides the prior", () => {
    const answers = bank(120);
    // Everyone says the "rare" answer a100.
    answers[100].count = 500;
    expect(rarityFor(answers, "a100", 500).tier).toBe(1);
    // And the formerly common a0 becomes rarer.
    expect(rarityFor(answers, "a0", 0).tier).toBeGreaterThan(1);
  });
  it("reveal percent switches to live data after the threshold", () => {
    expect(revealPercent(0.1, 1, 5)).toEqual({ percent: 10, estimated: true });
    expect(revealPercent(0.1, 20, 100)).toEqual({ percent: 20, estimated: false });
  });
});

describe("scoring", () => {
  it("maps tiers to rewards", () => {
    expect(rewardFor(1)).toMatchObject({ points: 10, depth: 40, airBonusMs: 8000 });
    expect(rewardFor(5)).toMatchObject({ points: 100, depth: 400, airBonusMs: 16000 });
    expect(rewardFor(0)).toMatchObject({ points: 0, depth: 0, airBonusMs: 0 });
  });
  it("drains air and adds bonus, capped", () => {
    expect(nextAir(45000, 5000, rewardFor(1))).toBe(48000);
    expect(nextAir(45000, 5000, null)).toBe(40000);
    expect(nextAir(58000, 0, rewardFor(5))).toBe(60000);
    // Out of air: only a valid answer at the bell (within grace, checked by the caller) survives.
    expect(nextAir(3000, 4000, null)).toBe(0);
    expect(nextAir(3000, 4000, rewardFor(5))).toBe(16000);
  });
});

describe("daily selection", () => {
  const pool = Array.from({ length: 40 }, (_, i) => ({
    id: `p${i}`,
    difficulty: ["easy", "medium", "hard"][i % 3],
    category: `c${i % 9}`,
  }));
  it("is deterministic per seed and differs across days", () => {
    const a = pickDaily(pool, "daily:2026-01-01");
    expect(pickDaily([...pool].reverse(), "daily:2026-01-01")).toEqual(a);
    expect(pickDaily(pool, "daily:2026-01-02")).not.toEqual(a);
    expect(new Set(a).size).toBe(7);
  });
});

describe("local matching", () => {
  const data = {
    id: "p",
    text: "Name a type of bridge",
    answers: [
      { id: "1", canonical: "Suspension", normalized: "suspension" },
      { id: "2", canonical: "Cable-stayed", normalized: "cable stayed" },
    ],
    aliases: [{ answerId: "1", normalized: "suspension bridge" }],
  };
  it("matches exact, alias and fuzzy", () => {
    expect(matchLocal("suspension", data)?.matchedBy).toBe("exact");
    expect(matchLocal("suspension bridge", data)?.matchedBy).toBe("alias");
    expect(matchLocal("cablestayed", data)?.matchedBy).toBe("fuzzy");
    expect(matchLocal("arch", data)).toBeNull();
  });
});
