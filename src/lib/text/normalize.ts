/**
 * Answer normalisation. The same function is applied to stored answers, aliases and
 * player input, so anything it folds together will match.
 */

/** UK -> US spellings (and a few common variants). Applied per token. */
const SPELLING: Record<string, string> = {
  colour: "color", flavour: "flavor", honour: "honor", humour: "humor", labour: "labor",
  neighbour: "neighbor", harbour: "harbor", armour: "armor", favourite: "favorite",
  behaviour: "behavior", rumour: "rumor", vapour: "vapor", odour: "odor", parlour: "parlor",
  centre: "center", theatre: "theater", metre: "meter", litre: "liter", fibre: "fiber",
  calibre: "caliber", sabre: "saber", spectre: "specter", meagre: "meager", lustre: "luster",
  grey: "gray", tyre: "tire", aluminium: "aluminum", jewellery: "jewelry", pyjama: "pajama",
  pyjamas: "pajamas", plough: "plow", doughnut: "donut", catalogue: "catalog", dialogue: "dialog",
  analogue: "analog", cheque: "check", programme: "program", moustache: "mustache",
  yoghurt: "yogurt", yogourt: "yogurt", mould: "mold", sceptic: "skeptic", aeroplane: "airplane",
  defence: "defense", offence: "offense", licence: "license", practise: "practice",
  organise: "organize", realise: "realize", recognise: "recognize", apologise: "apologize",
  paediatrician: "pediatrician", oesophagus: "esophagus", haemoglobin: "hemoglobin",
  anaemia: "anemia", encyclopaedia: "encyclopedia", manoeuvre: "maneuver", oestrogen: "estrogen",
  kerb: "curb", storey: "story", draught: "draft", whisky: "whiskey", ketchup: "ketchup",
  catsup: "ketchup", chilli: "chili", sulphur: "sulfur", artefact: "artifact", axe: "ax",
  gaol: "jail", mum: "mom", mam: "mom", arse: "ass", tonne: "ton", cosy: "cozy", ageing: "aging",
};

/**
 * Global multi-word or abbreviation synonyms, applied after punctuation is stripped.
 * Keys and values are already lower-case. Keep this list conservative: it applies to
 * every prompt.
 */
const PHRASES: Array<[RegExp, string]> = [
  [/\bst\b/g, "saint"],
  [/\bmt\b/g, "mount"],
  [/\bmr\b/g, "mister"],
  [/\bdr\b/g, "doctor"],
  [/\busa\b|\bus of a\b|\bunited states of america\b|\bamerica\b/g, "united states"],
  [/\buk\b|\bgreat britain\b|\bbritain\b/g, "united kingdom"],
  [/\bnyc\b|\bnew york city\b/g, "new york"],
  [/\bla\b(?= city|$)/g, "los angeles"],
  [/\btv\b/g, "television"],
  [/\bbbq\b/g, "barbecue"],
  [/\bbarbeque\b/g, "barbecue"],
];

/** Words that are already singular even though they end in "s". */
const SINGULAR_S = new Set([
  "bus", "gas", "glass", "grass", "class", "bass", "boss", "cross", "dress", "chess", "moss",
  "mass", "pass", "kiss", "lens", "news", "physics", "maths", "mathematics", "series",
  "species", "means", "lotus", "cactus", "octopus", "virus", "walrus", "hippopotamus",
  "platypus", "citrus", "asparagus", "hummus", "couscous", "tennis", "texas", "paris",
  "chris", "james", "jesus", "venus", "mars", "atlas", "iris", "christmas", "ross", "always",
  "plus", "bonus", "census", "circus", "corpus", "focus", "fungus", "genus", "nexus", "status",
  "has", "was", "is", "this", "us", "yes", "less", "unless", "across", "chaos", "bias", "canvas",
  "alias", "pancreas", "diabetes", "measles", "mumps", "rabies", "herpes", "isis", "osiris",
  "zeus", "ares", "hermes", "athens", "wales", "brussels", "marseilles", "lewis", "dennis",
  "thomas", "nicholas", "charles", "douglas", "marcus", "angus", "hollis", "jones", "brooks",
  "cyprus", "tunis", "laos", "honduras", "barbados", "bahamas", "philippines", "netherlands",
  "andes", "alps", "dallas", "vegas", "los", "des", "les", "las", "glasses", "scissors",
  "trousers", "pants", "jeans", "shorts", "tongs", "pliers", "binoculars", "goggles",
]);

/** Irregular plurals -> singular. */
const IRREGULAR: Record<string, string> = {
  children: "child", men: "man", women: "woman", mice: "mouse", geese: "goose", feet: "foot",
  teeth: "tooth", people: "person", oxen: "ox", lice: "louse", dice: "die", cacti: "cactus",
  fungi: "fungus", octopi: "octopus", knives: "knife", wives: "wife", leaves: "leaf",
  loaves: "loaf", wolves: "wolf", halves: "half", calves: "calf", shelves: "shelf",
  elves: "elf", thieves: "thief", scarves: "scarf", hooves: "hoof", potatoes: "potato",
  tomatoes: "tomato", heroes: "hero", echoes: "echo", volcanoes: "volcano", mangoes: "mango",
  criteria: "criterion", phenomena: "phenomenon", indices: "index", matrices: "matrix",
  vertices: "vertex", bacteria: "bacterium", fish: "fish", sheep: "sheep", deer: "deer",
  moose: "moose", salmon: "salmon", trout: "trout", series: "series", species: "species",
};

/** Singularise one lower-case token with simple English rules. */
export function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (SINGULAR_S.has(word)) return word;
  if (/[^aeiou]ies$/.test(word)) return word.slice(0, -3) + "y";
  if (/(ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (/(ss|us|is|os)$/.test(word)) return word;
  if (/s$/.test(word) && !/'s$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Remove accents: "Pokémon" -> "Pokemon", "Ångström" -> "Angstrom". */
export function stripAccents(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ø/g, "o")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d");
}

/**
 * Full normalisation pipeline. Returns "" for input with no letters or digits.
 * Example: "The Golden-Gate Bridges!" -> "golden gate bridge"
 */
export function normalizeAnswer(input: string): string {
  let s = stripAccents(input.toLowerCase().trim());
  s = s.replace(/&/g, " and ").replace(/\+/g, " plus ");
  // Drop possessive apostrophes then all remaining punctuation.
  s = s.replace(/['’`]s\b/g, "s").replace(/['’`]/g, "");
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  for (const [pattern, replacement] of PHRASES) s = s.replace(pattern, replacement);
  // Leading articles.
  s = s.replace(/^(the|a|an)\s+/, "");
  const tokens = s
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SPELLING[t] ?? t)
    .map(singularize)
    .map((t) => SPELLING[t] ?? t);
  return tokens.join(" ");
}

/** Normalised form with no spaces, so "spider man" and "spiderman" compare equal. */
export function compact(normalized: string): string {
  return normalized.replace(/\s+/g, "");
}
