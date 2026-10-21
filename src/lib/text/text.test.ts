import { describe, expect, it } from "vitest";
import { normalizeAnswer, singularize } from "./normalize";
import { editDistance, fuzzyFind } from "./fuzzy";
import { isProfane } from "./profanity";
import { findDuplicate, promptSignature } from "./similarity";

describe("normalizeAnswer", () => {
  it("lower-cases, strips punctuation and leading articles", () => {
    expect(normalizeAnswer("The Golden-Gate Bridge!")).toBe("golden gate bridge");
    expect(normalizeAnswer("  a   Banana ")).toBe("banana");
  });
  it("removes accents", () => {
    expect(normalizeAnswer("Pokémon")).toBe(normalizeAnswer("Pokemon"));
    expect(normalizeAnswer("Schrödinger")).toBe("schrodinger");
  });
  it("folds plurals", () => {
    expect(normalizeAnswer("Bridges")).toBe("bridge");
    expect(normalizeAnswer("Cherries")).toBe("cherry");
    expect(normalizeAnswer("Knives")).toBe("knife");
    expect(normalizeAnswer("glass")).toBe("glass");
    expect(normalizeAnswer("cactus")).toBe("cactus");
  });
  it("folds UK and US spelling", () => {
    expect(normalizeAnswer("colour")).toBe(normalizeAnswer("color"));
    expect(normalizeAnswer("Aluminium")).toBe(normalizeAnswer("aluminum"));
    expect(normalizeAnswer("theatre")).toBe(normalizeAnswer("theater"));
  });
  it("handles ampersands, possessives and abbreviations", () => {
    expect(normalizeAnswer("Mumford & Sons")).toBe(normalizeAnswer("Mumford and Sons"));
    expect(normalizeAnswer("St Paul's Cathedral")).toBe(normalizeAnswer("Saint Pauls Cathedral"));
    expect(normalizeAnswer("Mt Everest")).toBe(normalizeAnswer("Mount Everest"));
  });
  it("returns empty for junk", () => {
    expect(normalizeAnswer("!!!")).toBe("");
  });
  it("singularize leaves short words alone", () => {
    expect(singularize("gas")).toBe("gas");
    expect(singularize("bus")).toBe("bus");
  });
});

describe("fuzzy matching", () => {
  it("computes transposition-aware distance", () => {
    expect(editDistance("abc", "acb")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
  const candidates = [
    { key: "suspension", id: "1" },
    { key: "cantilever", id: "2" },
    { key: "cat", id: "3" },
    { key: "spider man", id: "4" },
  ];
  it("tolerates small typos on longer words", () => {
    expect(fuzzyFind("suspenson", candidates)?.id).toBe("1");
    expect(fuzzyFind("cantilevre", candidates)?.id).toBe("2");
  });
  it("is exact for short words", () => {
    expect(fuzzyFind("car", candidates)).toBeNull();
  });
  it("ignores spacing", () => {
    expect(fuzzyFind("spiderman", candidates)?.id).toBe("4");
  });
  it("rejects distant strings", () => {
    expect(fuzzyFind("submarine", candidates)).toBeNull();
  });
});

describe("profanity", () => {
  it("blocks obvious words and leetspeak", () => {
    expect(isProfane("fuck")).toBe(true);
    expect(isProfane("sh1t head")).toBe(true);
    expect(isProfane("f u c k")).toBe(true);
  });
  it("allows innocent words", () => {
    expect(isProfane("Scunthorpe")).toBe(false);
    expect(isProfane("peacock")).toBe(false);
    expect(isProfane("Essex")).toBe(false);
    expect(isProfane("grapes")).toBe(false);
    expect(isProfane("push it")).toBe(false);
    expect(isProfane("Diver Dan")).toBe(false);
  });
});

describe("prompt similarity", () => {
  it("flags rephrasings as duplicates", () => {
    const existing = [promptSignature("Name a type of bridge"), promptSignature("Name a famous painting")];
    expect(findDuplicate(promptSignature("Name a kind of bridge"), existing)).not.toBeNull();
    expect(findDuplicate(promptSignature("Name a well known painting"), existing)).not.toBeNull();
  });
  it("lets different prompts through", () => {
    const existing = [promptSignature("Name a type of bridge"), promptSignature("Name a famous painting")];
    expect(findDuplicate(promptSignature("Name a breed of dog"), existing)).toBeNull();
  });
});
