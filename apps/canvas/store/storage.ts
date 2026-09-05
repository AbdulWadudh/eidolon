const FALLBACK_FILE_NAME = "eidolon-store.json";

export interface KeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string | boolean | number): void;
  getBoolean(key: string): boolean | undefined;
  delete(key: string): void;
}

interface MMKVInstance {
  getString(key: string): string | undefined;
  set(key: string, value: string | boolean | number): void;
  getBoolean(key: string): boolean | undefined;
  remove?: (key: string) => void;
  delete?: (key: string) => void;
}

class MMKVStorageWrapper implements KeyValueStorage {
  private mmkv: MMKVInstance;

  constructor(mmkv: MMKVInstance) {
    this.mmkv = mmkv;
  }

  getString(key: string): string | undefined {
    return this.mmkv.getString(key);
  }

  set(key: string, value: string | boolean | number): void {
    this.mmkv.set(key, value);
  }

  getBoolean(key: string): boolean | undefined {
    return this.mmkv.getBoolean(key);
  }

  delete(key: string): void {
    if (typeof this.mmkv.remove === "function") {
      this.mmkv.remove(key);
    } else if (typeof this.mmkv.delete === "function") {
      this.mmkv.delete(key);
    }
  }
}

/**
 * Used whenever MMKV is unavailable: Expo Go, the web bundle, and tests.
 *
 * It used to persist only through `window.localStorage`, which does not exist
 * in React Native — so on a device the fallback was pure memory and pairing was
 * lost on every reload. It now writes a small JSON file through `expo-file-system`.
 *
 * Two details that are easy to get wrong on SDK 57: the package publishes an
 * `exports` map with only `.` and `./legacy`, so the `expo-file-system/next`
 * subpath does not resolve at all, and `File.text()` returns a promise. The
 * synchronous reader is `textSync()`, which is what keeps KeyValueStorage sync.
 */
export interface FallbackFile {
  textSync(): string;
  write(value: string): void;
  create(options?: { overwrite?: boolean; intermediates?: boolean }): void;
  exists: boolean;
}

export class FallbackStorage implements KeyValueStorage {
  private map = new Map<string, string | boolean | number>();
  private file: FallbackFile | null = null;

  constructor(file: FallbackFile | null = openFallbackFile()) {
    this.file = file;
    this.hydrate();
  }

  private hydrate(): void {
    if (this.file) {
      try {
        if (this.file.exists) {
          const parsed = JSON.parse(this.file.textSync()) as Record<
            string,
            string | boolean | number
          >;
          for (const [key, value] of Object.entries(parsed)) this.map.set(key, value);
        }
        return;
      } catch {
        // A corrupt file is not worth failing a launch over; start empty.
      }
    }

    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key?.startsWith("eidolon.")) continue;
        const value = window.localStorage.getItem(key);
        if (value !== null) this.map.set(key, value);
      }
    } catch {
      // Private browsing and quota errors both land here.
    }
  }

  private flush(): void {
    if (this.file) {
      try {
        if (!this.file.exists) this.file.create({ intermediates: true });
        this.file.write(JSON.stringify(Object.fromEntries(this.map)));
      } catch {
        // Out of space or a read-only sandbox; the in-memory copy still works.
      }
      return;
    }

    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      for (const [key, value] of this.map) window.localStorage.setItem(key, String(value));
    } catch {
      // Ignore quota.
    }
  }

  getString(key: string): string | undefined {
    const value = this.map.get(key);
    return typeof value === "string" ? value : undefined;
  }

  set(key: string, value: string | boolean | number): void {
    this.map.set(key, value);
    this.flush();
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.map.get(key);
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }

  delete(key: string): void {
    this.map.delete(key);
    if (this.file) {
      this.flush();
      return;
    }
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore.
      }
    }
  }
}

function openFallbackFile(): FallbackFile | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("expo-file-system");
    if (typeof fs?.File !== "function" || !fs?.Paths?.document) return null;
    const file = new fs.File(fs.Paths.document, FALLBACK_FILE_NAME) as FallbackFile;
    return typeof file.textSync === "function" ? file : null;
  } catch {
    return null;
  }
}

function initStorage(): KeyValueStorage {
  try {
    // Dynamic require so NitroModules does not crash module evaluation when running in Expo Go or web
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkvModule = require("react-native-mmkv");
    if (typeof mmkvModule.createMMKV === "function") {
      const instance = mmkvModule.createMMKV({ id: "eidolon-canvas-store" });
      return new MMKVStorageWrapper(instance);
    }
  } catch {
    // NitroModules unavailable (Expo Go, web, test environment) -> fall back cleanly
  }
  return new FallbackStorage();
}

export const appStorage: KeyValueStorage = initStorage();
