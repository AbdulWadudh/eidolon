import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useBarTopInset(): number {
  return useSafeAreaInsets().top;
}
