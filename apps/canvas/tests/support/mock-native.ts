import { mock } from "bun:test";

/**
 * Native module stubs shared by the theme suites.
 *
 * `mock.module` has to run before the store is imported, so every suite imports
 * this module first and then `await import`s the store.
 */
// Mock react-native and react-native-mmkv
mock.module("react-native", () => ({
  Platform: { OS: "ios" },
}));

const mockMemory = new Map<string, string | boolean | number>();
mock.module("react-native-mmkv", () => ({
  createMMKV: () => ({
    getString: (key: string) => {
      const v = mockMemory.get(key);
      return typeof v === "string" ? v : undefined;
    },
    set: (key: string, val: string | boolean | number) => {
      mockMemory.set(key, val);
    },
    getBoolean: (key: string) => {
      const v = mockMemory.get(key);
      return typeof v === "boolean" ? v : undefined;
    },
    remove: (key: string) => {
      mockMemory.delete(key);
      return true;
    },
    delete: (key: string) => {
      mockMemory.delete(key);
    },
  }),
}));

export { mockMemory };
