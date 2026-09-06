import { afterEach, describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { SERVER_DEFAULTS, STORAGE } from "../src";
import {
  getPersistentDataDir,
  getServerConfig,
  getServicesConfig,
  getStorageConfig,
  getTrustedOrigins,
  LANCEDB_DIR_PATH,
  missingStorageConfig,
  SQLITE_DB_PATH,
} from "../src/server";

const touched = new Set<string>();

function setEnv(name: string, value: string | undefined): void {
  touched.add(name);
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  for (const name of touched) {
    delete process.env[name];
  }
  touched.clear();
});

describe("server configuration", () => {
  it("falls back to the documented defaults", () => {
    setEnv("PORT", undefined);
    setEnv("HOST", undefined);

    expect(getServerConfig()).toEqual({
      port: SERVER_DEFAULTS.port,
      host: SERVER_DEFAULTS.host,
    });
  });

  it("reads the environment on every call", () => {
    setEnv("PORT", "8080");
    expect(getServerConfig().port).toBe(8080);

    setEnv("PORT", "9090");
    expect(getServerConfig().port).toBe(9090);
  });

  it("trusts loopback and the LAN address on the configured port", () => {
    setEnv("PORT", "4321");
    const origins = getTrustedOrigins();

    expect(origins).toHaveLength(3);
    expect(origins).toContain("http://localhost:4321");
    expect(origins).toContain("http://127.0.0.1:4321");
    for (const origin of origins) {
      expect(origin).toEndWith(":4321");
    }
  });
});

describe("storage configuration", () => {
  it("bakes in no host", () => {
    for (const name of STORAGE.requiredEnv) {
      setEnv(name, undefined);
    }
    setEnv("S3_PUBLIC_URL", undefined);

    const config = getStorageConfig();
    expect(config.endpoint).toBe("");
    expect(config.bucket).toBe("");
    expect(config.publicUrl).toBe("");
    expect(missingStorageConfig()).toEqual([...STORAGE.requiredEnv]);
  });

  it("derives the public URL from endpoint and bucket", () => {
    setEnv("S3_ENDPOINT", "https://s3.example.com");
    setEnv("S3_BUCKET", "media");
    setEnv("S3_PUBLIC_URL", undefined);

    expect(getStorageConfig().publicUrl).toBe("https://s3.example.com/media");
  });

  it("prefers an explicit public URL", () => {
    setEnv("S3_ENDPOINT", "https://s3.example.com");
    setEnv("S3_BUCKET", "media");
    setEnv("S3_PUBLIC_URL", "https://cdn.example.com/m");

    expect(getStorageConfig().publicUrl).toBe("https://cdn.example.com/m");
  });

  it('treats anything but "true" as virtual-host addressing', () => {
    setEnv("S3_FORCE_PATH_STYLE", "true");
    expect(getStorageConfig().forcePathStyle).toBe(true);

    setEnv("S3_FORCE_PATH_STYLE", "false");
    expect(getStorageConfig().forcePathStyle).toBe(false);
  });

  it("uses the S3 protocol default region only", () => {
    setEnv("S3_REGION", undefined);
    expect(getStorageConfig().region).toBe(STORAGE.defaultRegion);

    setEnv("S3_REGION", "eu-west-1");
    expect(getStorageConfig().region).toBe("eu-west-1");
  });
});

describe("service configuration", () => {
  it("treats an unset backend as absent rather than defaulting to a host", () => {
    for (const name of [
      "LLM_API_URL",
      "COMFYUI_URL",
      "LLM_MODEL",
      "TTS_API_URL",
      "EMBEDDINGS_API_URL",
      "EMBEDDINGS_MODEL",
    ]) {
      setEnv(name, undefined);
    }

    expect(getServicesConfig()).toEqual({
      llmApiUrl: "",
      llmModel: "",
      comfyUiUrl: "",
      ttsApiUrl: "",
      embeddingsApiUrl: "",
      embeddingsModel: "",
    });
  });

  it("falls back to the chat endpoint for embeddings until one is configured", () => {
    setEnv("LLM_API_URL", "http://127.0.0.1:8080/v1");
    setEnv("EMBEDDINGS_API_URL", undefined);
    expect(getServicesConfig().embeddingsApiUrl).toBe("http://127.0.0.1:8080/v1");

    setEnv("EMBEDDINGS_API_URL", "http://127.0.0.1:8090/v1");
    expect(getServicesConfig().embeddingsApiUrl).toBe("http://127.0.0.1:8090/v1");
  });
});

describe("persistent data paths", () => {
  it("resolves and creates a directory outside the repository", () => {
    const dir = getPersistentDataDir();

    expect(isAbsolute(dir)).toBe(true);
    expect(existsSync(dir)).toBe(true);
    expect(dir.replaceAll("\\", "/")).not.toContain("/packages/config");
  });

  it("places both databases in that directory", () => {
    expect(SQLITE_DB_PATH).toStartWith(getPersistentDataDir());
    expect(LANCEDB_DIR_PATH).toStartWith(getPersistentDataDir());
    expect(SQLITE_DB_PATH).toEndWith("eidolon.db");
    expect(LANCEDB_DIR_PATH).toEndWith("lancedb");
  });
});
