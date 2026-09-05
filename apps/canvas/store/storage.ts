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

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string | boolean | number>();

  constructor() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k?.startsWith("eidolon.")) {
            const v = window.localStorage.getItem(k);
            if (v !== null) this.map.set(k, v);
          }
        }
      } catch {
        // Fallback to in-memory
      }
    }
  }

  getString(key: string): string | undefined {
    const val = this.map.get(key);
    return typeof val === "string" ? val : undefined;
  }

  set(key: string, value: string | boolean | number): void {
    this.map.set(key, value);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, String(value));
      } catch {
        // Ignore quota
      }
    }
  }

  getBoolean(key: string): boolean | undefined {
    const val = this.map.get(key);
    if (typeof val === "boolean") return val;
    if (val === "true") return true;
    if (val === "false") return false;
    return undefined;
  }

  delete(key: string): void {
    this.map.delete(key);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
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
  return new MemoryStorage();
}

export const appStorage: KeyValueStorage = initStorage();
