import { beforeEach, describe, expect, it } from "bun:test";
import "./support/mock-native";

import type { FallbackFile } from "../store/storage";

const { FallbackStorage } = await import("../store/storage");

/** Stands in for the on-device JSON file, shared between two "launches". */
function fakeFile(): FallbackFile & { contents: string | null } {
  return {
    contents: null as string | null,
    get exists() {
      return this.contents !== null;
    },
    text() {
      return this.contents ?? "";
    },
    write(value: string) {
      this.contents = value;
    },
  };
}

describe("credentials survive a reload", () => {
  let file: ReturnType<typeof fakeFile>;
  let storage: InstanceType<typeof FallbackStorage>;

  beforeEach(() => {
    file = fakeFile();
    storage = new FallbackStorage(file);
  });

  it("writes straight through to the file", () => {
    storage.set("eidolon.server_host", "192.168.1.39:3000");
    expect(file.contents).toContain("192.168.1.39:3000");
  });

  it("reads back what it stored", () => {
    storage.set("eidolon.server_host", "https://3000.k79.quest");
    expect(storage.getString("eidolon.server_host")).toBe("https://3000.k79.quest");
  });

  it("round-trips the boolean that isPaired actually is", () => {
    storage.set("eidolon.is_paired", true);
    expect(storage.getBoolean("eidolon.is_paired")).toBe(true);

    storage.set("eidolon.is_paired", false);
    expect(storage.getBoolean("eidolon.is_paired")).toBe(false);
  });

  it("forgets a deleted key, in memory and on disk", () => {
    storage.set("eidolon.server_host", "gone");
    storage.delete("eidolon.server_host");

    expect(storage.getString("eidolon.server_host")).toBeUndefined();
    expect(new FallbackStorage(file).getString("eidolon.server_host")).toBeUndefined();
  });

  it("hydrates the next launch from what this one wrote", () => {
    storage.set("eidolon.server_host", "https://3000.k79.quest");
    storage.set("eidolon.pairing_token", "secret");
    storage.set("eidolon.is_paired", true);

    const relaunched = new FallbackStorage(file);
    expect(relaunched.getString("eidolon.server_host")).toBe("https://3000.k79.quest");
    expect(relaunched.getString("eidolon.pairing_token")).toBe("secret");
    expect(relaunched.getBoolean("eidolon.is_paired")).toBe(true);
  });

  it("starts empty rather than failing a launch on a corrupt file", () => {
    file.write("{ not json");
    expect(() => new FallbackStorage(file)).not.toThrow();
    expect(new FallbackStorage(file).getString("eidolon.server_host")).toBeUndefined();
  });

  it("survives having no file at all, which is the web bundle", () => {
    const memoryOnly = new FallbackStorage(null);
    memoryOnly.set("eidolon.server_host", "localhost:3000");
    expect(memoryOnly.getString("eidolon.server_host")).toBe("localhost:3000");
  });
});
