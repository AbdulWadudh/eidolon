import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useBarTopInset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === "android" ? 0 : insets.top;
}
