import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "@/auth/options";

let bootstrapped: Promise<void> | null = null;

async function migrate(): Promise<void> {
  const plan = await getMigrations(authOptions);
  const pending = plan.toBeCreated.length + plan.toBeAdded.length + plan.toBeAddedIndexes.length;

  if (pending === 0) return;

  const created = plan.toBeCreated.map((entry) => entry.table);
  const altered = plan.toBeAdded.map((entry) => entry.table);
  await plan.runMigrations();

  if (created.length > 0) console.log(`[Auth] Created tables: ${created.join(", ")}`);
  if (altered.length > 0) console.log(`[Auth] Added columns to: ${altered.join(", ")}`);
}

export function ensureAuthSchema(): Promise<void> {
  bootstrapped ??= migrate();
  return bootstrapped;
}
