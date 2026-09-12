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
      } catch {}
    }

    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key?.startsWith("eidolon.")) continue;
        const value = window.localStorage.getItem(key);
        if (value !== null) this.map.set(key, value);
      }
    } catch {}
  }

  private flush(): void {
    if (this.file) {
      try {
        if (!this.file.exists) this.file.create({ intermediates: true });
        this.file.write(JSON.stringify(Object.fromEntries(this.map)));
      } catch {}
      return;
    }

    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      for (const [key, value] of this.map) window.localStorage.setItem(key, String(value));
    } catch {}
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
      } catch {}
    }
  }
}

function openFallbackFile(): FallbackFile | null {
  try {
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
    const mmkvModule = require("react-native-mmkv");
    if (typeof mmkvModule.createMMKV === "function") {
      const instance = mmkvModule.createMMKV({ id: "eidolon-canvas-store" });
      return new MMKVStorageWrapper(instance);
    }
  } catch {}
  return new FallbackStorage();
}

export const appStorage: KeyValueStorage = initStorage();
