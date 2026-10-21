/**
 * Derives prisma/sqlite/schema.prisma from the Postgres schema for local SQLite dev.
 * Usage: npm run db:sqlite   (with DATABASE_URL="file:./dev.db")
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";

const source = readFileSync("prisma/schema.prisma", "utf8");
const sqlite = source
  .replace('provider  = "postgresql"', 'provider  = "sqlite"')
  .replace(/^\s*directUrl\s*=.*$/m, "");
mkdirSync("prisma/sqlite", { recursive: true });
writeFileSync("prisma/sqlite/schema.prisma", `// GENERATED from prisma/schema.prisma by scripts/sqlite-schema.mjs. Do not edit.\n${sqlite}`);
console.log("Wrote prisma/sqlite/schema.prisma");
