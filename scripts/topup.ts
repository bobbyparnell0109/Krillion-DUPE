/**
 * CLI version of the cron top-up: generates prompts when fewer than 200 are unplayed.
 * Usage: npm run topup
 */
import { db } from "../src/lib/db";
import { topUp } from "../src/lib/bank/pipeline";

topUp((m) => console.log(m), { maxNew: 200 })
  .then((report) => console.log(JSON.stringify(report, null, 2)))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
