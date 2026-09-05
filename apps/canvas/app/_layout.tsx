import "react-native-gesture-handler";
import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { vars } from "nativewind";
import * as React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeFonts } from "@/services/font-registry";
import { useConnectionStore } from "@/store/connection";
import { useThemeStore } from "@/store/theme-store";

export default function RootLayout() {
  const { isPaired, initializeConnection } = useConnectionStore();
  const { activeCharacterId, getDynamicCssVars, getResolvedTheme } = useThemeStore();
  const segments = useSegments();
  const router = useRouter();

  const dynamicVars = getDynamicCssVars(activeCharacterId ?? undefined);
  const resolvedTheme = getResolvedTheme(activeCharacterId ?? undefined);

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
        <View
          style={[vars(dynamicVars), { backgroundColor: resolvedTheme.canvas, flex: 1 }]}
          className="flex-1 bg-canvas will-change-variable"
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: resolvedTheme.canvas },
              animation: "fade",
            }}
          />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
