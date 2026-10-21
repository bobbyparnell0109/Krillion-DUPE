/**
 * Fills the prompt bank with Claude-generated prompts until it holds TARGET prompts.
 * Resumable: re-running only generates what is missing.
 *
 * Usage: npm run seed:ai            (target 500)
 *        npm run seed:ai -- 800     (custom target)
 */
import { db } from "../src/lib/db";
import { generatePrompts } from "../src/lib/bank/pipeline";
import { aiAvailable } from "../src/lib/ai/client";

async function main() {
  const target = Number(process.argv[2] ?? 500);
  if (!aiAvailable()) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env, or run `npm run seed:starter` for the offline starter bank.");
    process.exit(1);
  }
  const current = await db.prompt.count({ where: { status: "active" } });
  const wanted = Math.max(0, target - current);
  console.log(`Bank has ${current} active prompts, target ${target}: generating ${wanted}.`);
  if (wanted === 0) return;

  // Work in chunks so progress is saved and logged steadily.
  let stored = 0;
  while (stored < wanted) {
    const chunk = Math.min(40, wanted - stored);
    const report = await generatePrompts(chunk, (m) => console.log(m));
    stored += report.stored;
    console.log(`Chunk done: ${JSON.stringify(report)}. Progress ${stored}/${wanted}.`);
    if (report.stored === 0) {
      console.error("No prompts stored in this chunk; stopping to avoid burning credits. Check the log above.");
      break;
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
