import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Resolves the OS-level directory that holds Eidolon's persistent state, and
 * creates it if it is missing.
 *
 * The databases used to live in `apps/conductor/data/`. That put every
 * character, message and memory one `git clean` or one reclone away from being
 * destroyed, and made the working tree carry state that belongs to the machine.
 * State is now owned by the OS user account instead of by the checkout, so the
 * repository can be deleted and cloned again without losing anything.
 *
 * Windows: `%LOCALAPPDATA%\eidolon\data`
 * Linux/macOS: `~/.eidolon/data`
 *
 * `EIDOLON_DATA_DIR` overrides both. A container has no meaningful home
 * directory - writing to one would land inside the writable layer and vanish
 * with the container - so the deployment points this at a mounted volume
 * instead. It is the same escape hatch for anyone keeping state on another disk.
 *
 * `homedir()` is the fallback for the rare shell that starts without
 * `LOCALAPPDATA` or `HOME`; concatenating an undefined env var would otherwise
 * create a literal `undefined` directory next to the process.
 */
export function getPersistentDataDir(): string {
  const base =
    process.env.EIDOLON_DATA_DIR ||
    (process.platform === "win32"
      ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "eidolon", "data")
      : join(process.env.HOME || homedir(), ".eidolon", "data"));

  mkdirSync(base, { recursive: true });
  return base;
}

/** Absolute path of the SQLite relational database file. */
export const SQLITE_DB_PATH: string = join(getPersistentDataDir(), "eidolon.db");

/** Absolute path of the LanceDB vector store directory. */
export const LANCEDB_DIR_PATH: string = join(getPersistentDataDir(), "lancedb");
