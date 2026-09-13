import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_THEME_TOKENS } from "@eidolon/tokens";
import { tokensToCssVars } from "../store/theme-css-vars";

const ROOT = join(import.meta.dir, "..");

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

const DASHBOARD_FILES = [
  "components/admin/StorageBrowser.tsx",
  "components/admin/QueueStateTabs.tsx",
  "components/admin/EditableRow.tsx",
  "components/admin/AdminScreen.tsx",
  "components/admin/MediaPreview.tsx",
  "components/admin/ImageLightbox.tsx",
  "components/ui/toast.tsx",
  "app/(main)/admin/config.tsx",
  "app/(main)/admin/users.tsx",
  "app/(main)/admin/prompts.tsx",
  "app/(main)/admin/audit.tsx",
  "app/(main)/admin/health.tsx",
  "app/(main)/admin/queues.tsx",
  "app/(main)/admin/index.tsx",
];

const CLASSNAME = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g;

function classNamesIn(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(CLASSNAME)) {
    found.push(match[1] ?? match[2] ?? "");
  }
  return found;
}

function isCircle(className: string): boolean {
  return (
    /\bh-[\d.]+ w-[\d.]+\b/.test(className) || className.includes("overflow-hidden rounded-full")
  );
}

describe("the radius the theme studio sets", () => {
  it("is published as the variable every rounded-* utility reads", () => {
    const vars = tokensToCssVars({ ...DEFAULT_THEME_TOKENS, radius: 22 });

    expect(vars["--radius"]).toBe("22px");
    expect(vars["--radius-card"]).toBe("22px");
    expect(vars["--radius-button"]).toBe("22px");
    expect(vars["--radius-input"]).toBe("22px");
  });

  it("moves with the token rather than sitting at the shipped default", () => {
    const tight = tokensToCssVars({ ...DEFAULT_THEME_TOKENS, radius: 0 });
    const round = tokensToCssVars({ ...DEFAULT_THEME_TOKENS, radius: 40 });

    expect(tight["--radius-button"]).toBe("0px");
    expect(round["--radius-button"]).toBe("40px");
  });

  it("maps those variables in the stylesheet the utilities compile against", () => {
    const css = readFileSync(join(ROOT, "global.css"), "utf8");

    expect(css).toContain("--radius-card: var(--radius,");
    expect(css).toContain("--radius-button: var(--radius,");
    expect(css).toContain("--radius-input: var(--radius,");
  });

  it("leaves no pill in the dashboard pinned to a hardcoded full radius", () => {
    const offenders: string[] = [];

    for (const file of DASHBOARD_FILES) {
      for (const className of classNamesIn(source(file))) {
        if (!className.includes("rounded-full")) continue;
        if (isCircle(className)) continue;
        offenders.push(`${file}: ${className}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
