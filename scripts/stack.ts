import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface Service {
  name: string;
  health: string;
  launch?: { command: string; args: string[]; cwd?: string };
  waitSeconds: number;
  optional?: boolean;
}

const AI_ROOT = process.env.EIDOLON_AI_ROOT ?? "G:\\AI\\EIDOLON";
const START = join(AI_ROOT, "START");

const SERVICES: Service[] = [
  {
    name: "llm",
    health: "http://127.0.0.1:8080/v1/models",
    launch: { command: "cmd", args: ["/c", "start", "", join(START, "start-llm.bat")] },
    waitSeconds: 180,
  },
  {
    name: "tts",
    health: "http://127.0.0.1:8880/v1/models",
    launch: { command: "cmd", args: ["/c", "start", "", join(START, "start-tts.bat")] },
    waitSeconds: 120,
  },
  {
    name: "comfyui",
    health: "http://127.0.0.1:8188/system_stats",
    launch: { command: "cmd", args: ["/c", "start", "", join(START, "start-comfy.bat")] },
    waitSeconds: 300,
  },
  {
    name: "storage",
    health: "http://127.0.0.1:9000/minio/health/live",
    waitSeconds: 60,
    optional: true,
  },
  {
    name: "conductor",
    health: "http://127.0.0.1:3000/health",
    launch: { command: "bun", args: ["--cwd", "apps/conductor", "dev"] },
    waitSeconds: 90,
  },
];

async function isHealthy(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(service: Service): Promise<boolean> {
  const deadline = Date.now() + service.waitSeconds * 1000;
  while (Date.now() < deadline) {
    if (await isHealthy(service.health)) return true;
    await Bun.sleep(1500);
  }
  return false;
}

function launch(service: Service): void {
  if (!service.launch) return;
  const child = spawn(service.launch.command, service.launch.args, {
    cwd: service.launch.cwd,
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  child.unref();
}

function report(name: string, state: "up" | "started" | "failed" | "skipped", note = ""): void {
  const mark = state === "failed" ? "x" : state === "skipped" ? "-" : "ok";
  console.log(`  [${mark}] ${name.padEnd(10)} ${note}`);
}

async function status(): Promise<void> {
  console.log("\nEidolon stack\n");
  for (const service of SERVICES) {
    const healthy = await isHealthy(service.health);
    report(service.name, healthy ? "up" : "failed", healthy ? service.health : "not responding");
  }
  console.log("");
}

async function up(): Promise<void> {
  if (!existsSync(START)) {
    console.log(`\nNo AI servers at ${START}.`);
    console.log("Set EIDOLON_AI_ROOT if they live somewhere else.\n");
  }

  console.log("\nBringing up the Eidolon stack\n");
  let failures = 0;

  for (const service of SERVICES) {
    if (await isHealthy(service.health)) {
      report(service.name, "up", "already running");
      continue;
    }

    if (!service.launch) {
      report(
        service.name,
        service.optional ? "skipped" : "failed",
        "not running, and this script does not start it",
      );
      if (!service.optional) failures += 1;
      continue;
    }

    launch(service);
    const ready = await waitFor(service);
    report(
      service.name,
      ready ? "started" : "failed",
      ready ? "" : `gave up after ${service.waitSeconds}s`,
    );
    if (!ready && !service.optional) failures += 1;
  }

  console.log(
    failures === 0 ? "\nEverything is up.\n" : `\n${failures} service(s) did not come up.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

const command = process.argv[2] ?? "up";
if (command === "status") {
  await status();
} else {
  await up();
}
