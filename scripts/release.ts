#!/usr/bin/env bun
/**
 * Bumps the version, promotes the CHANGELOG "Unreleased" notes, builds a release
 * APK named `eidolon-v<version>.apk`, and publishes it to GitHub Releases.
 *
 *   bun run release                 patch bump  (1.0.0 -> 1.0.1)
 *   bun run release --minor         minor bump  (1.0.0 -> 1.1.0)
 *   bun run release --major         major bump  (1.0.0 -> 2.0.0)
 *   bun run release --version 2.3.0 explicit
 *   bun run release --dry-run       print what would happen, change nothing
 *   bun run release --skip-build    reuse an APK that is already built
 *
 * Order matters: the version is written *before* the build, because prebuild
 * bakes it into the APK. Files are only committed once the build succeeds, so a
 * failed build never leaves a pushed version bump behind.
 */
import { $ } from "bun";

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const DRY_RUN = has("--dry-run");
const SKIP_BUILD = has("--skip-build");

const APP_CONFIG = "apps/canvas/app.json";
const CHANGELOG = "CHANGELOG.md";
const GRADLE_OUTPUT = "apps/canvas/android/app/build/outputs/apk/release/app-release.apk";
const DIST_DIR = "dist";

function fail(message: string, hint?: string): never {
  console.error(`\n  ${message}`);
  if (hint) console.error(`  -> ${hint}`);
  console.error("");
  process.exit(1);
}

async function capture(command: Promise<{ exitCode: number; stdout: Buffer }>): Promise<string> {
  const result = await command;
  return result.exitCode === 0 ? result.stdout.toString().trim() : "";
}

// --------------------------------------------------------------- version
function nextVersion(current: string): string {
  const explicitIndex = argv.indexOf("--version");
  if (explicitIndex !== -1) {
    const value = argv[explicitIndex + 1];
    if (!value || !/^\d+\.\d+\.\d+$/.test(value)) {
      fail("--version needs a semver value, e.g. --version 2.3.0");
    }
    return value;
  }

  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    fail(`expo.version "${current}" is not semver, so it cannot be bumped.`);
  }
  const [major = 0, minor = 0, patch = 0] = parts;
  if (has("--major")) return `${major + 1}.0.0`;
  if (has("--minor")) return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const appConfig = await Bun.file(APP_CONFIG).json();
const currentVersion: string = appConfig?.expo?.version;
if (!currentVersion) fail(`No expo.version in ${APP_CONFIG}.`);

const version = nextVersion(currentVersion);
const tag = `v${version}`;
const apkName = `eidolon-${tag}.apk`;
const apkPath = `${DIST_DIR}/${apkName}`;
// Android refuses to install over an existing app with the same versionCode, so
// every published build needs a higher one regardless of the semver bump.
const versionCode: number = Number(appConfig?.expo?.android?.versionCode ?? 0) + 1;

console.log(`\n${currentVersion} -> ${version}  (versionCode ${versionCode})`);
console.log(`Artifact: ${apkName}\n`);

// ------------------------------------------------------------- preflight
const remote = await capture($`git remote get-url origin`.nothrow().quiet());
if (!remote && !DRY_RUN) {
  fail(
    "This repository has no 'origin' remote, so there is no releases page to publish to.",
    "gh repo create --source=. --private --remote=origin",
  );
}

if (!DRY_RUN) {
  if ((await $`gh auth status`.nothrow().quiet()).exitCode !== 0) {
    fail("GitHub CLI is not authenticated.", "Run: gh auth login");
  }
  if (await capture($`git status --porcelain`.nothrow().quiet())) {
    fail(
      "Working tree has uncommitted changes.",
      "Commit or stash first - the release commit should contain only the bump.",
    );
  }
  if (await capture($`gh release view ${tag} --json tagName`.nothrow().quiet())) {
    fail(`Release ${tag} already exists.`, `Delete it, or pick another --version.`);
  }
}

// ------------------------------------------------------------- changelog
/** git log field delimiter (%x1f), safe inside commit subjects. */
const UNIT_SEPARATOR = String.fromCharCode(31);

/** Conventional-commit type -> changelog heading, in the order they render. */
const TYPE_HEADINGS: [RegExp, string][] = [
  [/^feat/, "### Added"],
  [/^fix/, "### Fixed"],
  [/^perf/, "### Performance"],
  [/^refactor/, "### Changed"],
  [/^docs/, "### Documentation"],
  [/^(build|ci|chore)/, "### Build & tooling"],
  [/^test/, "### Tests"],
];

function headingFor(subject: string): string {
  const type = /^([a-z]+)(\([^)]*\))?!?:/i.exec(subject)?.[1]?.toLowerCase() ?? "";
  return TYPE_HEADINGS.find(([pattern]) => pattern.test(type))?.[1] ?? "### Other";
}

/** Drops the `type(scope):` prefix and capitalises what is left. */
function describe(subject: string): string {
  const body = subject.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, "").trim();
  return body.charAt(0).toUpperCase() + body.slice(1);
}

async function generateNotes(): Promise<string> {
  const previousTag = await capture($`git describe --tags --abbrev=0`.nothrow().quiet());
  const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
  const log = await capture(
    $`git log ${range} --no-merges --pretty=format:%h%x1f%s`.nothrow().quiet(),
  );
  if (!log) return "";

  const grouped = new Map<string, string[]>();
  for (const line of log.split("\n")) {
    const [hash, subject] = line.split(UNIT_SEPARATOR);
    if (!hash || !subject) continue;
    // A previous release commit is bookkeeping, not a change.
    if (/^chore\(release\)/i.test(subject)) continue;
    const heading = headingFor(subject);
    const entries = grouped.get(heading) ?? [];
    entries.push(`- ${describe(subject)} (${hash})`);
    grouped.set(heading, entries);
  }
  if (grouped.size === 0) return "";

  const ordered = [...TYPE_HEADINGS.map(([, heading]) => heading), "### Other"];
  return ordered
    .filter((heading) => grouped.has(heading))
    .map((heading) => `${heading}\n\n${grouped.get(heading)?.join("\n")}`)
    .join("\n\n");
}

const changelog = await Bun.file(CHANGELOG).text();
// `$` would mean end-of-line under the m flag and stop the lazy match at the
// first newline; `(?![\s\S])` is end-of-input.
const unreleased = /^## \[Unreleased\][^\n]*\n([\s\S]*?)(?=\n## \[|(?![\s\S]))/m.exec(changelog);
const handWritten = unreleased?.[1]?.trim() ?? "";
// The placeholder a previous release leaves behind is not release notes.
const manual = /^nothing yet\.?$/i.test(handWritten) ? "" : handWritten;

const notes = manual || (await generateNotes());
if (!notes) {
  fail(
    "No commits since the last release, and nothing under '## [Unreleased]'.",
    "Commit something first.",
  );
}
console.log(
  manual ? "Notes: hand-written [Unreleased] section\n" : "Notes: generated from commits\n",
);

const today = new Date().toISOString().slice(0, 10);
const promoted = changelog.replace(
  /^## \[Unreleased\][^\n]*\n[\s\S]*?(?=\n## \[|(?![\s\S]))/m,
  `## [Unreleased]\n\nNothing yet.\n\n## [${version}] - ${today}\n\n${notes}\n`,
);

if (DRY_RUN) {
  console.log("--dry-run: nothing written. Release notes would be:\n");
  console.log(notes);
  console.log("");
  process.exit(0);
}

// ------------------------------------------------------------ write bump
appConfig.expo.version = version;
appConfig.expo.android = { ...appConfig.expo.android, versionCode };
await Bun.write(APP_CONFIG, `${JSON.stringify(appConfig, null, 2)}\n`);
await Bun.write(CHANGELOG, promoted);

// Long-form dated entry, so changelog/ stays current without anyone remembering.
const [year, month] = today.split("-");
const entryPath = `changelog/${year}/${month}/${today}-release-${tag}.md`;
await Bun.write(
  entryPath,
  `# Release ${tag}\n\n**Date:** ${today}\n**Artifact:** ${apkName}\n` +
    `**versionCode:** ${versionCode}\n\n${notes}\n`,
);
console.log(`Wrote ${APP_CONFIG}, ${CHANGELOG} and ${entryPath}\n`);

// ----------------------------------------------------------------- build
if (SKIP_BUILD) {
  console.log("Skipping build (--skip-build)\n");
} else {
  console.log("Building release APK - this takes a few minutes\n");
  if ((await $`bun run build:apk`.nothrow()).exitCode !== 0) {
    fail(
      "APK build failed. The version bump is written but NOT committed.",
      `Fix the build and re-run with --version ${version}, or \`git checkout .\` to undo.`,
    );
  }
}

const built = Bun.file(GRADLE_OUTPUT);
if (!(await built.exists())) fail(`No APK at ${GRADLE_OUTPUT}.`, "Run without --skip-build.");

await $`mkdir -p ${DIST_DIR}`.nothrow().quiet();
await Bun.write(apkPath, built);
console.log(`Packaged ${apkPath}  (${(Bun.file(apkPath).size / 1024 / 1024).toFixed(1)} MB)\n`);

// --------------------------------------------------------------- publish
await $`git add ${APP_CONFIG} ${CHANGELOG} ${entryPath}`;
await $`git commit -m ${`chore(release): ${tag}`}`;
if ((await $`git push`.nothrow()).exitCode !== 0) {
  fail(
    "git push failed; the release commit is local only.",
    "Push manually, then re-run with --skip-build.",
  );
}

const create =
  await $`gh release create ${tag} ${apkPath} --title ${`Eidolon ${tag}`} --notes ${notes}`.nothrow();
if (create.exitCode !== 0) fail("gh release create failed. See the output above.");

const url = await capture($`gh release view ${tag} --json url --jq .url`.nothrow().quiet());
console.log(`\nPublished ${tag}${url ? `  ${url}` : ""}\n`);
