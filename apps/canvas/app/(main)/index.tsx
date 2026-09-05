import { useRouter } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { ThemeStudioSheet } from "@/components/theme/ThemeStudioSheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Logout01Icon, PaintBoardIcon, Settings01Icon, SparklesIcon } from "@/lib/icons";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function MainCharactersScreen() {
  const router = useRouter();
  const { serverHost, unpair, connectionState } = useConnectionStore();
  const theme = useResolvedTheme();

  const [showSettings, setShowSettings] = React.useState(false);
  const [showThemeStudio, setShowThemeStudio] = React.useState(false);

  // The pill used to be hard-coded green, which said "connected" even while the
  // socket was down. It now reflects the actual connection state.
  const status = {
    connected: { color: theme.success, label: serverHost || "connected" },
    connecting: { color: theme.warning, label: "Connecting…" },
    error: { color: theme.danger, label: "Disconnected" },
    disconnected: { color: theme.textMuted, label: "Offline" },
  }[connectionState];

  const handleEnterStage = () => {
    router.push("/chat/emma");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      {/* Screen Header */}
      <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
        <Text className="font-main-bold text-2xl text-text-primary tracking-tight">Eidolon</Text>

        {/* Connection Status Pill */}
        <View className="flex-row items-center gap-2 rounded-full border border-border bg-audio-pill px-3 py-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
          <Text className="font-ui text-xs text-text-muted" numberOfLines={1}>
            {status.label}
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-2">
          <Pressable
            className="rounded-full border border-border bg-card p-2 active:bg-border"
            onPress={() => setShowThemeStudio(true)}
          >
            <AppIcon icon={PaintBoardIcon} size={18} color={theme.primary} />
          </Pressable>

          <Pressable
            className="rounded-full border border-border bg-card p-2 active:bg-border"
            onPress={() => setShowSettings((prev) => !prev)}
          >
            <AppIcon icon={Settings01Icon} size={18} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Settings Dropdown/Drawer Card */}
        {showSettings && (
          <Card className="border-primary/30 bg-card">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-ui-bold text-sm text-text-primary">Conductor Node</Text>
                <Text className="font-ui text-xs text-text-muted">{serverHost}</Text>
              </View>
              <Button
                variant="destructive"
                size="sm"
                className="flex-row gap-1.5"
                onPress={() => {
                  unpair();
                  router.replace("/(auth)/pairing");
                }}
              >
                <AppIcon icon={Logout01Icon} size={14} color={theme.textPrimary} />
                <Text className="font-ui-medium text-xs text-text-primary">Unpair</Text>
              </Button>
            </View>
          </Card>
        )}

        {/* Section Heading */}
        <View className="flex-row items-center gap-2">
          <AppIcon icon={SparklesIcon} size={16} color={theme.primary} />
          <Text className="font-ui-medium text-xs text-text-muted uppercase tracking-wider">
            Available Personas
          </Text>
        </View>

        {/* Emma Character Card */}
        <Card className="border-border bg-card p-5">
          <CardHeader className="flex-row items-center gap-4 pb-4">
            <Avatar size={56} className="border-2 border-primary">
              <AvatarFallback textClassName="text-lg font-main-bold text-primary">
                EM
              </AvatarFallback>
            </Avatar>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-main-bold text-xl text-text-primary">Emma</Text>
                <Badge variant="success">Active • Teasing</Badge>
              </View>
              <Text className="mt-0.5 font-ui text-xs text-text-muted">
                Stage 1 Persona • Conductor Synced
              </Text>
            </View>
          </CardHeader>

          <CardContent className="pb-3">
            <Text className="font-main text-sm text-text-muted leading-5">
              Quick-witted and playfully challenging. Designed for deep dialogue, responsive audio
              synthesis, and adaptive interaction.
            </Text>
          </CardContent>

          <CardFooter className="pt-2">
            <Button variant="default" size="default" className="w-full" onPress={handleEnterStage}>
              Enter Stage
            </Button>
          </CardFooter>
        </Card>

        {/* Dynamic Theming Studio Card */}
        <Card className="border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2">
                <AppIcon icon={PaintBoardIcon} size={16} color={theme.primary} />
                <Text className="font-main-bold text-sm text-text-primary">
                  Dynamic Theme Studio
                </Text>
              </View>
              <Text className="mt-1 font-ui text-xs text-text-muted">
                100% dynamic CSS variable customizer. Control global defaults and character
                overrides with custom hex pickers and arbitrary radius.
              </Text>
            </View>
            <Button variant="default" size="sm" onPress={() => setShowThemeStudio(true)}>
              Open Studio
            </Button>
          </View>
        </Card>

        {/* Lab Link Card */}
        <Card className="border-border bg-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-2">
                <AppIcon icon={SparklesIcon} size={16} color={theme.primary} />
                <Text className="font-main-bold text-sm text-text-primary">
                  Font & Typography Lab
                </Text>
              </View>
              <Text className="mt-1 font-ui text-xs text-text-muted">
                OTA font downloads and live typography inspector.
              </Text>
            </View>
            <Button variant="secondary" size="sm" onPress={() => router.push("/demo")}>
              Open Lab
            </Button>
          </View>
        </Card>
      </ScrollView>

      {/* Theme Studio Modal Sheet */}
      <ThemeStudioSheet
        isOpen={showThemeStudio}
        onClose={() => setShowThemeStudio(false)}
        characterId="emma"
        characterName="Emma"
      />
    </SafeAreaView>
  );
}
