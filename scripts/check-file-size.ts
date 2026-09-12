#!/usr/bin/env bun
import { Glob } from "bun";

const LIMIT = 300;
const SHOW_ALL = process.argv.includes("--all");

const KNOWN_DEBT: Record<string, number> = {
  "apps/canvas/app/(main)/demo.tsx": 886,
  "apps/canvas/components/theme/ThemeStudioSheet.tsx": 736,
  "apps/canvas/store/theme-store.ts": 317,
  "apps/canvas/components/ui/font-picker-modal.tsx": 345,
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
  for await (const match of new Glob(`${root}*.{ts,tsx}`).scan({ onlyFiles: true })) {
    const path = match.replaceAll("\\", "/");
    if (IGNORED.test(path)) continue;

    const text = await Bun.file(path).text();
    const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    if (lines <= LIMIT) continue;

    offenders.push({ path, lines, budget: KNOWN_DEBT[path] ?? null });
  }
}

offenders.sort((a, b) => b.lines - a.lines);

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
