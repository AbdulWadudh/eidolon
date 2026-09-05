import "react-native-gesture-handler";
import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { AppState, View } from "react-native";
import { VariableContextProvider } from "react-native-css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeFonts } from "@/services/font-registry";
import { useConnectionStore } from "@/store/connection";
import { flushThemePersistence, useResolvedTheme, useThemeCssVars } from "@/store/theme-store";

export default function RootLayout() {
  const { isPaired, initializeConnection } = useConnectionStore();
  const dynamicVars = useThemeCssVars();
  const resolvedTheme = useResolvedTheme();
  const segments = useSegments();
  const router = useRouter();

  const rootStyle = React.useMemo(
    () => ({ backgroundColor: resolvedTheme.canvas, flex: 1 }),
    [resolvedTheme.canvas],
  );
  const stackScreenOptions = React.useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: resolvedTheme.canvas },
      animation: "fade" as const,
    }),
    [resolvedTheme.canvas],
  );

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") flushThemePersistence();
    });
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    initializeConnection();
    initializeFonts().catch((err) => {
      console.warn("Font initialization error:", err);
    });
  }, [initializeConnection]);

  React.useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const isDemoRoute = segments.includes("demo");
    if (!isPaired && !inAuthGroup && !isDemoRoute && segments[0] !== undefined) {
      router.replace("/(auth)/pairing");
    } else if (isPaired && inAuthGroup) {
      router.replace("/(main)");
    }
  }, [isPaired, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={resolvedTheme.mode === "light" ? "dark" : "light"} />
        <VariableContextProvider value={dynamicVars}>
          <View style={rootStyle} className="flex-1 bg-canvas">
            <Stack screenOptions={stackScreenOptions} />
          </View>
        </VariableContextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
