/**
 * Loads the hand-written starter bank (no API key needed).
 * Usage: npm run seed:starter
 */
import { PrismaClient } from "@prisma/client";
import { storePrompt, type NewAnswer } from "../src/lib/bank/store";
import { STARTER_BANK } from "./starter-bank";

const db = new PrismaClient();

/** Answers are listed most -> least common; map list position to a prior tier. */
function tierForPosition(index: number, total: number): number {
  const p = index / Math.max(1, total);
  if (index < 3 || p < 0.06) return 1;
  if (p < 0.2) return 2;
  if (p < 0.45) return 3;
  if (p < 0.75) return 4;
  return 5;
}

function parseAnswers(spec: string): NewAnswer[] {
  const parts = spec.split("|").map((s) => s.trim()).filter(Boolean);
  return parts.map((part, i) => {
    const [canonical, aliasSpec] = part.split("=");
    return {
      canonical: canonical.trim(),
      aliases: aliasSpec ? aliasSpec.split(";").map((a) => a.trim()).filter(Boolean) : [],
      tier: tierForPosition(i, parts.length),
    };
  });
}

async function main() {
  let added = 0;
  for (const prompt of STARTER_BANK) {
    const result = await storePrompt(db, { ...prompt, source: "starter", answers: parseAnswers(prompt.answers) });
    if (result) {
      added++;
      console.log(`+ ${prompt.text} (${result.answers} answers)`);
    } else {
      console.log(`= ${prompt.text} (already in bank)`);
    }
  }
  const total = await db.prompt.count();
  console.log(`\nStarter bank loaded: ${added} new prompts, ${total} prompts in the bank.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
