import { Platform } from "react-native";

type BlurModule = typeof import("expo-blur");

function loadBlurModule(): BlurModule | null {
  if (Platform.OS === "web") return null;
  try {
    const { requireNativeModule } = require("expo-modules-core");
    requireNativeModule("ExpoBlur");
    return require("expo-blur") as BlurModule;
  } catch {
    return null;
  }
}

const blurModule = loadBlurModule();

export const isNativeBlurAvailable = blurModule !== null;
export const BlurView = blurModule?.BlurView ?? null;
export const BlurTargetView = blurModule?.BlurTargetView ?? null;
