#!/usr/bin/env bun
/**
 * Enforces the 300-line source file limit from RULES.md.
 *
 *   bun run check:size          fail on any new file over the limit
 *   bun run check:size --all    list every file over the limit, debt included
 *
 * Files already over the limit when the rule was introduced are listed in
 * KNOWN_DEBT with their size at that moment. They do not fail the check, but
 * they may not grow either: exceeding the recorded count is an error. That way
 * the rule bites immediately for new code without demanding an unrelated
 * refactor from whoever touches an old file next.
 */
import { Glob } from "bun";

const LIMIT = 300;
const SHOW_ALL = process.argv.includes("--all");

/**
 * path -> the file's current line count. Ratchet these down when a file
 * shrinks; the check fails if any of them grows.
 */
const KNOWN_DEBT: Record<string, number> = {
  "apps/canvas/app/(main)/demo.tsx": 886,
  "apps/canvas/components/theme/ThemeStudioSheet.tsx": 736,
  "apps/canvas/store/theme-store.ts": 317,
  "apps/canvas/components/ui/font-picker-modal.tsx": 345,
  "apps/canvas/store/connection.ts": 336,
  "apps/canvas/services/font-registry.ts": 308,
};

const SEARCH_ROOTS = ["apps", "packages", "scripts"];
const IGNORED = /(^|\/)(node_modules|android|ios|dist|\.expo|\.turbo|build)(\/|$)/;

interface Offender {
  path: string;
  lines: number;
  budget: number | null;
}

const offenders: Offender[] = [];

for (const root of SEARCH_ROOTS) {
  for await (const match of new Glob(`${root}/**/*.{ts,tsx}`).scan({ onlyFiles: true })) {
    const path = match.replaceAll("\\", "/");
    if (IGNORED.test(path)) continue;

    const text = await Bun.file(path).text();
    // Match wc -l: a trailing newline terminates the last line, it does not add one.
    const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    if (lines <= LIMIT) continue;

    offenders.push({ path, lines, budget: KNOWN_DEBT[path] ?? null });
  }
}

offenders.sort((a, b) => b.lines - a.lines);

// New files over the limit, or known-debt files that have grown since.
const failures = offenders.filter(({ lines, budget }) => budget === null || lines > budget);

if (SHOW_ALL) {
  console.log(`\nFiles over ${LIMIT} lines\n`);
  for (const { path, lines, budget } of offenders) {
    const label = budget === null ? "NEW" : lines > budget ? `GREW from ${budget}` : "known debt";
    console.log(`  ${String(lines).padStart(5)}  ${path}  (${label})`);
  }
  console.log("");
}

if (failures.length === 0) {
  console.log(`\nNo new files over ${LIMIT} lines. ${offenders.length} known-debt file(s).\n`);
  process.exit(0);
}

console.error(`\nRULES.md: source files must stay under ${LIMIT} lines.\n`);
for (const { path, lines, budget } of failures) {
  console.error(
    budget === null
      ? `  ${path} is ${lines} lines. Split it.`
      : `  ${path} grew ${budget} -> ${lines}. Split it rather than adding to it.`,
  );
}
console.error("\nSplit by responsibility, not by line count.\n");
process.exit(1);
