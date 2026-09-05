const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Patch fs.promises.readFile with concurrency throttling and retry on EMFILE for Windows
const originalReadFile = fs.promises.readFile;
let activeReads = 0;
const MAX_CONCURRENT_READS = 64;
const readQueue = [];

function dequeue() {
  if (activeReads < MAX_CONCURRENT_READS && readQueue.length > 0) {
    activeReads++;
    const item = readQueue.shift();
    if (item) {
      item
        .fn()
        .then(item.resolve, item.reject)
        .finally(() => {
          activeReads--;
          dequeue();
        });
    }
  }
}

function throttledRead(fn) {
  return new Promise((resolve, reject) => {
    readQueue.push({ fn, resolve, reject });
    dequeue();
  });
}

fs.promises.readFile = (...args) =>
  throttledRead(async () => {
    let retries = 5;
    while (true) {
      try {
        return await originalReadFile.apply(fs.promises, args);
      } catch (err) {
        if (err && err.code === "EMFILE" && retries > 0) {
          retries--;
          await new Promise((r) => setTimeout(r, 50 * (6 - retries)));
        } else {
          throw err;
        }
      }
    }
  });

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Block non-canvas directories from being indexed by Metro to save file handles
config.resolver.blockList = [
  /.*[/\\]apps[/\\]conductor[/\\].*/,
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]\.system_generated[/\\].*/,
];

// Cap maxWorkers to avoid exhausting Windows file descriptors
config.maxWorkers = Math.min(os.cpus().length, 4);

module.exports = withNativewind(config);
