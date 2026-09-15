import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Runs before anything imports the config, because the database path is resolved once at
// import. Without this the suite wrote into the real data directory — which is where the
// stray Char-123 characters and char-test-* memories in it came from.
process.env.EIDOLON_DATA_DIR ||= mkdtempSync(join(tmpdir(), "eidolon-tests-"));
