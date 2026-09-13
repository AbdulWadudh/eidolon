import { Stack } from "expo-router";
import * as React from "react";
import { useResolvedTheme } from "@/store/theme-store";

export default function MainLayout() {
  const theme = useResolvedTheme();

  const screenOptions = React.useMemo(
    () => ({ headerShown: false, contentStyle: { backgroundColor: theme.canvas } }),
    [theme.canvas],
  );

  return <Stack screenOptions={screenOptions} />;
}
