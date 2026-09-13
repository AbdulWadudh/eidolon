import { useFocusEffect } from "expo-router";
import * as React from "react";
import { useThemeStore } from "@/store/theme-store";

export function useGlobalThemeScope(): void {
  const setActiveCharacter = useThemeStore((state) => state.setActiveCharacter);

  useFocusEffect(
    React.useCallback(() => {
      setActiveCharacter(null);
    }, [setActiveCharacter]),
  );
}
