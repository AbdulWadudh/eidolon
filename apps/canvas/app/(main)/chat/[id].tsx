import { ArrowLeft01Icon, Call02Icon } from "@hugeicons/core-free-icons";
import { capitalize, isString } from "es-toolkit";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useThemeStore } from "@/store/theme-store";

export default function ChatShellScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getResolvedTheme, setActiveCharacter } = useThemeStore();

  const characterId = isString(id) ? id : "default";
  const theme = getResolvedTheme(characterId);

  React.useEffect(() => {
    setActiveCharacter(characterId);
    return () => {
      setActiveCharacter(null);
    };
  }, [characterId, setActiveCharacter]);

  const characterName = capitalize(characterId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        {/* Back Chevron */}
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card active:bg-border"
          onPress={() => router.back()}
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={theme.textPrimary} />
        </Pressable>

        {/* Character Title Center */}
        <View className="flex-row items-center gap-2.5">
          <Avatar size={34} className="border border-primary">
            <AvatarFallback textClassName="font-main-bold text-xs text-primary">
              {characterName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <View>
            <Text className="font-main-bold text-base text-text-primary">{characterName}</Text>
            <View className="flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full bg-success" />
              <Text className="font-ui text-[11px] text-text-muted">Ready for Stage</Text>
            </View>
          </View>
        </View>

        {/* Phone Call Button */}
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card active:bg-border"
          onPress={() => {
            // Audio call trigger placeholder
          }}
        >
          <AppIcon icon={Call02Icon} size={20} color={theme.primary} />
        </Pressable>
      </View>

      {/* Placeholder Body */}
      <View className="flex-1 items-center justify-center p-6">
        <View className="items-center rounded-card border border-border bg-card p-6 max-w-sm w-full">
          <Avatar size={64} className="mb-4 border-2 border-primary">
            <AvatarFallback textClassName="font-main-bold text-xl text-primary">
              {characterName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <Text className="font-main-bold text-xl text-text-primary">
            {characterName} Stage Shell
          </Text>
          <Text className="mt-2 text-center font-ui text-xs text-text-muted leading-4">
            Route resolved successfully: /chat/{id}
          </Text>

          <View className="mt-4">
            <Badge variant="warning">Dialogue & Audio Ready</Badge>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
