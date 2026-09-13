import {
  CHARACTER_COPY,
  CONFIRM_COPY,
  CONNECTION_COPY,
  DASHBOARD_COPY,
  GALLERY_COPY,
  HOME_COPY,
  UI_MS,
} from "@eidolon/config";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { CharacterRosterCard } from "@/components/characters/CharacterCard";
import { ImportCardButton } from "@/components/characters/ImportCardButton";
import { CharacterSettingsSheet } from "@/components/chat/CharacterSettingsSheet";
import { AppIcon } from "@/components/common/icon";
import { LoadingState } from "@/components/common/loading-state";
import { ThemeStudioSheet } from "@/components/theme/ThemeStudioSheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import {
  DashboardSquare01Icon,
  Logout01Icon,
  PaintBoardIcon,
  Settings01Icon,
  SparklesIcon,
} from "@/lib/icons";
import { useAuthStore, useIsOwner } from "@/store/auth-store";
import { type CharacterSummary, fetchCharacters } from "@/store/character-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function MainCharactersScreen() {
  const router = useRouter();
  const { serverHost, pairingToken, unpair, connectionState } = useConnectionStore();
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const isOwner = useIsOwner();
  const refreshAccount = useAuthStore((state) => state.refresh);
  const confirmation = useConfirm();

  const revealAt = (index: number) =>
    reduced
      ? FadeIn.duration(UI_MS.revealReduced)
      : FadeInDown.duration(UI_MS.reveal).delay(index * UI_MS.revealStagger);

  const [showSettings, setShowSettings] = React.useState(false);
  const [showThemeStudio, setShowThemeStudio] = React.useState(false);
  const [roster, setRoster] = React.useState<CharacterSummary[]>([]);
  const [isLoadingRoster, setLoadingRoster] = React.useState(true);
  const [managing, setManaging] = React.useState<CharacterSummary | null>(null);

  const refreshRoster = React.useCallback(
    () => fetchCharacters(serverHost).then(setRoster),
    [serverHost],
  );

  useFocusEffect(
    React.useCallback(() => {
      void refreshAccount(serverHost, pairingToken);
    }, [refreshAccount, serverHost, pairingToken]),
  );

  useFocusEffect(
    React.useCallback(() => {
      let live = true;

      void fetchCharacters(serverHost).then((next) => {
        if (!live) return;
        setRoster(next);
        setLoadingRoster(false);
      });

      return () => {
        live = false;
      };
    }, [serverHost]),
  );

  const status = {
    connected: { color: theme.success, label: serverHost || "connected" },
    connecting: { color: theme.warning, label: CONNECTION_COPY.connecting },
    error: { color: theme.danger, label: CONNECTION_COPY.disconnected },
    disconnected: { color: theme.textMuted, label: CONNECTION_COPY.disconnected },
  }[connectionState];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      {}
      <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
        <Text className="font-main-bold text-2xl text-text-primary tracking-tight">Eidolon</Text>

        {}
        <GlassSurface
          tint="card"
          className="flex-row items-center gap-2 overflow-hidden rounded-full border border-border px-3 py-1.5"
        >
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
          <Text className="font-ui text-xs text-text-muted" numberOfLines={1}>
            {status.label}
          </Text>
        </GlassSurface>

        {}
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
        {}
        {showSettings && (
          <Card className="border-primary/30">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-ui-bold text-sm text-text-primary">
                  {HOME_COPY.connectedTo}
                </Text>
                <Text className="font-ui text-xs text-text-muted">{serverHost}</Text>
              </View>
              <Button
                variant="destructive"
                size="sm"
                className="flex-row gap-1.5"
                onPress={() =>
                  confirmation.ask({
                    title: CONFIRM_COPY.unpair,
                    body: CONFIRM_COPY.unpairBody,
                    confirmLabel: CONFIRM_COPY.unpairAction,
                    onConfirm: () => {
                      unpair();
                      router.replace("/(auth)/pairing");
                    },
                  })
                }
              >
                <AppIcon icon={Logout01Icon} size={14} color={theme.textPrimary} />
                <Text className="font-ui-medium text-xs text-text-primary">
                  {HOME_COPY.disconnect}
                </Text>
              </Button>
            </View>
          </Card>
        )}

        {}
        <View className="flex-row items-center gap-2">
          <AppIcon icon={SparklesIcon} size={16} color={theme.primary} />
          <Text className="font-ui-medium text-xs text-text-muted uppercase tracking-wider">
            {HOME_COPY.whosHere}
          </Text>
        </View>

        {isLoadingRoster && roster.length === 0 ? (
          <LoadingState label={GALLERY_COPY.loadingRoster} fill={false} />
        ) : roster.length === 0 ? (
          <Animated.View entering={revealAt(0)}>
            <Card className="border-border p-5">
              <Text className="font-main text-sm text-text-muted leading-5">
                {CHARACTER_COPY.emptyRoster}
              </Text>
            </Card>
          </Animated.View>
        ) : (
          roster.map((character, index) => (
            <Animated.View entering={revealAt(index)} key={character.id}>
              <CharacterRosterCard
                character={character}
                onOpen={() => router.push(`/chat/${character.id}`)}
                onEdit={() => setManaging(character)}
              />
            </Animated.View>
          ))
        )}

        <Animated.View entering={revealAt(roster.length)}>
          <Button
            variant="secondary"
            size="default"
            className="w-full"
            onPress={() => router.push("/characters/new")}
          >
            {CHARACTER_COPY.newCharacter}
          </Button>
        </Animated.View>

        <Animated.View entering={revealAt(0)}>
          <ImportCardButton
            serverHost={serverHost}
            onImported={(characterId) => {
              void refreshRoster().then(() => router.push(`/chat/${characterId}`));
            }}
          />
        </Animated.View>

        {isOwner ? (
          <Animated.View entering={revealAt(0)}>
            <Card className="border-primary/30 p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <AppIcon icon={DashboardSquare01Icon} size={16} color={theme.primary} />
                    <Text className="font-main-bold text-sm text-text-primary">
                      {DASHBOARD_COPY.title}
                    </Text>
                  </View>
                  <Text className="mt-1 font-ui text-xs text-text-muted">
                    {DASHBOARD_COPY.blurb}
                  </Text>
                </View>
                <Button variant="default" size="sm" onPress={() => router.push("/(main)/admin")}>
                  {HOME_COPY.open}
                </Button>
              </View>
            </Card>
          </Animated.View>
        ) : null}

        {/* Dynamic Theming Studio Card */}
        <Animated.View entering={revealAt(1)}>
          <Card className="border-border p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <AppIcon icon={PaintBoardIcon} size={16} color={theme.primary} />
                  <Text className="font-main-bold text-sm text-text-primary">
                    {HOME_COPY.lookTitle}
                  </Text>
                </View>
                <Text className="mt-1 font-ui text-xs text-text-muted">{HOME_COPY.lookBlurb}</Text>
              </View>
              <Button variant="default" size="sm" onPress={() => setShowThemeStudio(true)}>
                {HOME_COPY.open}
              </Button>
            </View>
          </Card>
        </Animated.View>

        {/* Lab Link Card */}
        <Animated.View entering={revealAt(2)}>
          <Card className="border-border p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <AppIcon icon={SparklesIcon} size={16} color={theme.primary} />
                  <Text className="font-main-bold text-sm text-text-primary">
                    {HOME_COPY.typeTitle}
                  </Text>
                </View>
                <Text className="mt-1 font-ui text-xs text-text-muted">{HOME_COPY.typeBlurb}</Text>
              </View>
              <Button variant="secondary" size="sm" onPress={() => router.push("/demo")}>
                {HOME_COPY.open}
              </Button>
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {confirmation.sheet}

      <CharacterSettingsSheet
        isOpen={managing !== null}
        characterId={managing?.id ?? ""}
        avatarUrl={managing?.avatarUrl ?? null}
        avatarCrop={managing?.avatarCrop ?? null}
        onClose={() => {
          setManaging(null);
          void refreshRoster();
        }}
        onOpenTheme={() => setShowThemeStudio(true)}
        onForked={(characterId) => {
          setManaging(null);
          void refreshRoster().then(() => router.push(`/chat/${characterId}`));
        }}
      />

      {/* Theme Studio Modal Sheet */}
      <ThemeStudioSheet
        isOpen={showThemeStudio}
        onClose={() => setShowThemeStudio(false)}
        characterId={managing?.id ?? "emma"}
        characterName={managing?.name ?? "Emma"}
      />
    </SafeAreaView>
  );
}
