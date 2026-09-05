#!/usr/bin/env bun
/**
 * Preflight check for the Eidolon toolchain.
 *
 * Installs what can be installed safely and non-interactively (workspace
 * packages, Android SDK components via sdkmanager). A JDK or the Android SDK
 * itself is reported with the exact fix rather than installed, because putting
 * a multi-gigabyte SDK or a second JVM on someone's machine is not a decision a
 * build script should make.
 *
 *   bun run doctor          check, and install what is safe
 *   bun run doctor:check    report only, never install (use in CI)
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Status = "ok" | "warn" | "fail";

interface Result {
  status: Status;
  name: string;
  detail?: string;
  fix?: string;
}

const CHECK_ONLY = process.argv.includes("--check");
const IS_WINDOWS = process.platform === "win32";

const results: Result[] = [];
let hasBlocker = false;

function record(status: Status, name: string, detail?: string, fix?: string): void {
  results.push({ status, name, detail, fix });
  if (status === "fail") hasBlocker = true;
}

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/**
 * Bun.spawnSync takes an argv array and never goes through a shell, so paths
 * like "C:\Program Files\..." need no quoting and cannot be word-split.
 */
function exec(argv: string[]): { code: number; out: string } {
  try {
    const result = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
    return {
      code: result.exitCode,
      out: `${decode(result.stdout)}${decode(result.stderr)}`.trim(),
    };
  } catch {
    return { code: -1, out: "" };
  }
}

function firstLine(argv: string[]): string | null {
  const { code, out } = exec(argv);
  if (code !== 0 || !out) return null;
  return out.split("\n")[0]?.trim() ?? null;
}

function majorVersion(value: string | null): number {
  const match = /(\d+)/.exec(value ?? "");
  return match?.[1] ? Number(match[1]) : 0;
}

// ---------------------------------------------------------------- runtimes
function checkBun(): void {
  const version = Bun.version;
  record(
    majorVersion(version) >= 1 ? "ok" : "warn",
    "Bun",
    version,
    majorVersion(version) >= 1 ? undefined : "Bun 1.x expected.",
  );
}

function checkNode(): void {
  const version = firstLine(["node", "--version"]);
  if (!version) {
    record("warn", "Node", "not found", "The Expo CLI expects Node 20+ on PATH.");
    return;
  }
  const major = majorVersion(version.replace(/^v/, ""));
  record(
    major >= 20 ? "ok" : "warn",
    "Node",
    version,
    major >= 20 ? undefined : "Node 20 or newer is expected by the Expo CLI.",
  );
}

// ------------------------------------------------------------------- java
function resolveJavaHome(): string | null {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  // Android Studio bundles a JBR that Gradle is happy with.
  const candidates = IS_WINDOWS
    ? [
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Android", "Android Studio", "jbr"),
        join(process.env.LOCALAPPDATA ?? "", "Programs", "Android Studio", "jbr"),
      ]
    : ["/Applications/Android Studio.app/Contents/jbr/Contents/Home", "/usr/lib/jvm/default-java"];
  return candidates.find((path) => path.length > 0 && existsSync(path)) ?? null;
}

function checkJava(): void {
  const javaHome = resolveJavaHome();
  if (!javaHome) {
    record(
      "fail",
      "JDK 17+",
      "no JAVA_HOME and no Android Studio JBR found",
      "Install a JDK 17+ (or Android Studio) and set JAVA_HOME.",
    );
    return;
  }

  const javaBin = join(javaHome, "bin", IS_WINDOWS ? "java.exe" : "java");
  const version = existsSync(javaBin) ? firstLine([javaBin, "-version"]) : null;
  if (!version) {
    record("fail", "JDK 17+", `no runnable java at ${javaBin}`, "Reinstall the JDK.");
    return;
  }

  // `openjdk version "21.0.10" ...` - read the number inside the quotes.
  const major = majorVersion(/"([^"]+)"/.exec(version)?.[1] ?? version);
  record(
    major >= 17 ? "ok" : "fail",
    "JDK 17+",
    `${version}  (${javaHome})`,
    major >= 17 ? undefined : "The Android Gradle Plugin requires JDK 17 or newer.",
  );

  if (!process.env.JAVA_HOME) {
    record("warn", "JAVA_HOME", "not set", `Set JAVA_HOME=${javaHome} so Gradle picks that JVM.`);
  }
}

// ---------------------------------------------------------------- android
function androidSdkRoot(): string | null {
  const explicit = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (explicit && existsSync(explicit)) return explicit;
  const fallback = IS_WINDOWS
    ? join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk")
    : join(process.env.HOME ?? "", "Library", "Android", "sdk");
  return existsSync(fallback) ? fallback : null;
}

function sdkManagerPath(sdkRoot: string): string | null {
  const binary = IS_WINDOWS ? "sdkmanager.bat" : "sdkmanager";
  for (const root of [join(sdkRoot, "cmdline-tools"), join(sdkRoot, "tools")]) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const candidate = join(root, entry, "bin", binary);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function listInstalled(sdkRoot: string, dir: string): string[] {
  const full = join(sdkRoot, dir);
  return existsSync(full) ? readdirSync(full) : [];
}

function checkAndroid(): void {
  const sdkRoot = androidSdkRoot();
  if (!sdkRoot) {
    record(
      "fail",
      "Android SDK",
      "not found",
      "Install Android Studio (or the SDK command line tools) and set ANDROID_HOME.",
    );
    return;
  }
  record("ok", "Android SDK", sdkRoot);

  if (!process.env.ANDROID_HOME) {
    record("warn", "ANDROID_HOME", "not set", `Set ANDROID_HOME=${sdkRoot}.`);
  }

  const platforms = listInstalled(sdkRoot, "platforms");
  const buildTools = listInstalled(sdkRoot, "build-tools");
  const ndks = listInstalled(sdkRoot, "ndk");
  const cmakes = listInstalled(sdkRoot, "cmake");

  record(platforms.length ? "ok" : "fail", "SDK platforms", platforms.join(", ") || "none");
  record(buildTools.length ? "ok" : "warn", "Build tools", buildTools.join(", ") || "none");
  // Reanimated, Nitro/MMKV, screens and worklets all compile from source, so a
  // missing NDK surfaces as an opaque CMake failure deep in the Gradle log.
  record(ndks.length ? "ok" : "fail", "NDK", ndks.join(", ") || "none (native modules need it)");
  record(cmakes.length ? "ok" : "fail", "CMake", cmakes.join(", ") || "none");

  const missing: string[] = [];
  if (!platforms.length) missing.push("platforms;android-36");
  if (!buildTools.length) missing.push("build-tools;36.0.0");
  if (!ndks.length) missing.push("ndk;27.1.12297006");
  if (!cmakes.length) missing.push("cmake;3.22.1");
  if (missing.length === 0) return;

  const sdkmanager = sdkManagerPath(sdkRoot);
  if (!sdkmanager) {
    record(
      "fail",
      "sdkmanager",
      "not found",
      `Install the SDK command line tools, then: sdkmanager ${missing.join(" ")}`,
    );
    return;
  }

  if (CHECK_ONLY) {
    record("fail", "SDK components", `missing: ${missing.join(", ")}`, "Run: bun run doctor");
    return;
  }

  console.log(`\nInstalling missing SDK components: ${missing.join(", ")}\n`);
  const install = Bun.spawnSync([sdkmanager, ...missing], { stdout: "inherit", stderr: "inherit" });
  record(
    install.exitCode === 0 ? "ok" : "fail",
    "SDK components",
    install.exitCode === 0 ? "installed" : "install failed",
    install.exitCode === 0 ? undefined : `Run manually: sdkmanager ${missing.join(" ")}`,
  );
}

// -------------------------------------------------------------- workspace
function checkWorkspaceInstall(): void {
  if (existsSync(join(process.cwd(), "node_modules"))) {
    record("ok", "Workspace packages", "node_modules present");
    return;
  }
  if (CHECK_ONLY) {
    record("fail", "Workspace packages", "not installed", "Run: bun install");
    return;
  }
  console.log("\nnode_modules missing - running bun install\n");
  const install = Bun.spawnSync(["bun", "install"], { stdout: "inherit", stderr: "inherit" });
  record(
    install.exitCode === 0 ? "ok" : "fail",
    "Workspace packages",
    install.exitCode === 0 ? "installed" : "bun install failed",
    install.exitCode === 0 ? undefined : "Run: bun install",
  );
}

// -------------------------------------------------------------- reporting
checkBun();
checkNode();
checkWorkspaceInstall();
checkJava();
checkAndroid();

const ICONS: Record<Status, string> = { ok: "OK  ", warn: "WARN", fail: "FAIL" };
console.log("\nEidolon environment\n===================");
for (const { status, name, detail, fix } of results) {
  console.log(`${ICONS[status]}  ${name.padEnd(20)} ${detail ?? ""}`);
  if (fix) console.log(`      -> ${fix}`);
}

if (hasBlocker) {
  console.log("\nSomething above blocks an Android build. Fix the FAIL lines and re-run.\n");
  process.exit(1);
}
console.log("\nEnvironment looks good. Build an APK with: bun run build:apk\n");
