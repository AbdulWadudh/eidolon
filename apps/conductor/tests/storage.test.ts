import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { getPersistentDataDir, LANCEDB_DIR_PATH, SQLITE_DB_PATH } from "@eidolon/config/server";
import {
  audioKey,
  buildPublicReadPolicy,
  getStorageConfig,
  imageKey,
  missingStorageConfig,
  publicUrl,
} from "@/services/storage";

const TEST_CONFIG = {
  S3_ENDPOINT: "https://s3.example.com",
  S3_REGION: "eu-west-1",
  S3_BUCKET: "test-media",
  S3_ACCESS_KEY: "test-access-key",
  S3_SECRET_KEY: "test-secret-key",
  S3_FORCE_PATH_STYLE: "true",
} as const;

const OVERRIDDEN = [...Object.keys(TEST_CONFIG), "S3_PUBLIC_URL", "EIDOLON_DATA_DIR"];
const saved = new Map<string, string | undefined>();

function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

beforeAll(() => {
  for (const name of OVERRIDDEN) {
    saved.set(name, process.env[name]);
  }
  for (const [name, value] of Object.entries(TEST_CONFIG)) {
    process.env[name] = value;
  }
  delete process.env.S3_PUBLIC_URL;
});

afterAll(() => {
  for (const name of OVERRIDDEN) {
    setEnv(name, saved.get(name));
  }
});

function isOutside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel.length > 0 && (isAbsolute(rel) || rel.startsWith(".."));
}

describe("Persistent OS data paths", () => {
  it("resolves outside the repository so a reclone cannot destroy state", () => {
    const dataDir = getPersistentDataDir();
    const repoRoot = resolve(process.cwd(), "..", "..");

    expect(isAbsolute(dataDir)).toBe(true);
    expect(isOutside(process.cwd(), dataDir)).toBe(true);
    expect(isOutside(repoRoot, dataDir)).toBe(true);
  });

  it("creates the directory on first use", () => {
    expect(existsSync(getPersistentDataDir())).toBe(true);
  });

  it("places the SQLite file and the LanceDB directory side by side", () => {
    const dataDir = getPersistentDataDir();

    expect(SQLITE_DB_PATH).toBe(resolve(dataDir, "eidolon.db"));
    expect(LANCEDB_DIR_PATH).toBe(resolve(dataDir, "lancedb"));
    expect(isOutside(process.cwd(), SQLITE_DB_PATH)).toBe(true);
    expect(isOutside(process.cwd(), LANCEDB_DIR_PATH)).toBe(true);
  });

  it("honours EIDOLON_DATA_DIR so a container can point at a mounted volume", () => {
    const previous = process.env.EIDOLON_DATA_DIR;
    const override = join(tmpdir(), `eidolon-data-dir-${crypto.randomUUID().slice(0, 8)}`);
    process.env.EIDOLON_DATA_DIR = override;

    try {
      expect(getPersistentDataDir()).toBe(override);
      expect(existsSync(override)).toBe(true);
    } finally {
      setEnv("EIDOLON_DATA_DIR", previous);
      rmSync(override, { recursive: true, force: true });
    }
  });

  it("matches the platform convention", () => {
    const dataDir = getPersistentDataDir().replaceAll("\\", "/");

    if (process.platform === "win32") {
      expect(dataDir).toEndWith("/eidolon/data");
    } else {
      expect(dataDir).toEndWith("/.eidolon/data");
    }
  });
});

describe("Object storage keys and URLs", () => {
  it("namespaces images by character", () => {
    expect(imageKey("char-42", "portrait.webp")).toBe("images/characters/char-42/portrait.webp");
  });

  it("namespaces audio by character", () => {
    expect(audioKey("char-42", "line-001.mp3")).toBe("audio/char-42/line-001.mp3");
  });

  it("derives the public base from the endpoint and bucket when S3_PUBLIC_URL is unset", () => {
    expect(publicUrl(imageKey("char-42", "portrait.webp"))).toBe(
      `${TEST_CONFIG.S3_ENDPOINT}/${TEST_CONFIG.S3_BUCKET}/images/characters/char-42/portrait.webp`,
    );
    expect(publicUrl(audioKey("char-42", "line-001.mp3"))).toBe(
      `${TEST_CONFIG.S3_ENDPOINT}/${TEST_CONFIG.S3_BUCKET}/audio/char-42/line-001.mp3`,
    );
  });

  it("prefers S3_PUBLIC_URL so media can be served from a CDN or custom domain", () => {
    process.env.S3_PUBLIC_URL = "https://cdn.example.com/media";

    try {
      expect(publicUrl(audioKey("char-42", "line-001.mp3"))).toBe(
        "https://cdn.example.com/media/audio/char-42/line-001.mp3",
      );
    } finally {
      delete process.env.S3_PUBLIC_URL;
    }
  });
});

describe("Object storage configuration", () => {
  it("takes every value from the environment", () => {
    const config = getStorageConfig();

    expect(config.endpoint).toBe(TEST_CONFIG.S3_ENDPOINT);
    expect(config.bucket).toBe(TEST_CONFIG.S3_BUCKET);
    expect(config.region).toBe(TEST_CONFIG.S3_REGION);
    expect(config.forcePathStyle).toBe(true);
  });

  it("falls back to the S3 protocol default region only", () => {
    const previous = process.env.S3_REGION;
    delete process.env.S3_REGION;

    try {
      expect(getStorageConfig().region).toBe("us-east-1");
    } finally {
      setEnv("S3_REGION", previous);
    }
  });

  it("treats any value other than 'true' as virtual-host addressing", () => {
    process.env.S3_FORCE_PATH_STYLE = "false";

    try {
      expect(getStorageConfig().forcePathStyle).toBe(false);
    } finally {
      process.env.S3_FORCE_PATH_STYLE = TEST_CONFIG.S3_FORCE_PATH_STYLE;
    }
  });

  it("reports nothing missing once the required settings are present", () => {
    expect(missingStorageConfig()).toEqual([]);
  });

  it("names the settings an operator still has to fill in", () => {
    const previousEndpoint = process.env.S3_ENDPOINT;
    const previousKey = process.env.S3_ACCESS_KEY;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY;

    try {
      expect(missingStorageConfig()).toEqual(["S3_ENDPOINT", "S3_ACCESS_KEY"]);
      expect(getStorageConfig().publicUrl).toBe("");
    } finally {
      setEnv("S3_ENDPOINT", previousEndpoint);
      setEnv("S3_ACCESS_KEY", previousKey);
    }
  });

  it("grants anonymous GetObject on the bucket and nothing else", () => {
    const policy = JSON.parse(buildPublicReadPolicy(TEST_CONFIG.S3_BUCKET)) as {
      Version: string;
      Statement: Array<{
        Effect: string;
        Principal: { AWS: string[] };
        Action: string[];
        Resource: string[];
      }>;
    };

    expect(policy.Version).toBe("2012-10-17");
    expect(policy.Statement).toHaveLength(1);

    const statement = policy.Statement[0];
    expect(statement.Effect).toBe("Allow");
    expect(statement.Principal.AWS).toEqual(["*"]);
    expect(statement.Action).toEqual(["s3:GetObject"]);
    expect(statement.Resource).toEqual([`arn:aws:s3:::${TEST_CONFIG.S3_BUCKET}/*`]);
  });
});
