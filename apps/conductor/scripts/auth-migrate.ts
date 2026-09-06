/**
 * Creates Better Auth's tables.
 *
 * The official CLI cannot do this here: it loads the config through jiti, which
 * runs on Node and cannot resolve `bun:sqlite`, so it dies importing the
 * database. The migration planner is a plain function, so it is called directly
 * from Bun instead, which keeps the schema exactly what this version expects
 * rather than a hand-written copy that drifts.
 */
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "@/auth/options";
import { db } from "@/db";

const before = db
  .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((row) => row.name);

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(authOptions);

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log("[auth] Schema already matches. Nothing to do.");
  process.exit(0);
}

for (const table of toBeCreated) {
  console.log(`[auth] create ${table.table}: ${Object.keys(table.fields).join(", ")}`);
}
for (const table of toBeAdded) {
  console.log(`[auth] alter  ${table.table}: ${Object.keys(table.fields).join(", ")}`);
}

await runMigrations();

const after = db
  .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((row) => row.name);

console.log(`[auth] added: ${after.filter((name) => !before.includes(name)).join(", ") || "none"}`);
process.exit(0);
