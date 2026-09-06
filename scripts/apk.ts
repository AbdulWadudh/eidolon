import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const CANVAS = join(ROOT, "apps", "canvas");
const BUILT = join(
  CANVAS,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);
const OUT_DIR = join(ROOT, "apks");

function shortSha(): string {
  const result = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { cwd: ROOT });
  return new TextDecoder().decode(result.stdout).trim() || "unknown";
}

async function version(): Promise<string> {
  const config = await Bun.file(join(CANVAS, "app.json")).json();
  return config.expo?.version ?? "0.0.0";
}

const skipBuild = process.argv.includes("--no-build");

if (!skipBuild) {
  const build = Bun.spawnSync(["bun", "run", "build:apk:android"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (build.exitCode !== 0) process.exit(build.exitCode ?? 1);
}

const source = Bun.file(BUILT);
if (!(await source.exists())) {
  console.error(`\nNo APK at ${BUILT}\n`);
  process.exit(1);
}

// Gradle always writes the same filename, so builds overwrite each other and
// there is no telling which commit one came from. Every build is kept here
// under its version and commit instead.
mkdirSync(OUT_DIR, { recursive: true });
const name = `eidolon-v${await version()}-${shortSha()}.apk`;
const target = join(OUT_DIR, name);

await Bun.write(target, source);
console.log(`\n  ${name}`);
console.log(`  ${(source.size / 1024 / 1024).toFixed(1)} MB`);
console.log(`  ${target}\n`);
