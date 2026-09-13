import {
  CHARACTER_COPY,
  CONFIRM_COPY,
  CONNECTION_COPY,
  DASHBOARD_COPY,
  GALLERY_COPY,
  HOME_COPY,
  PERSONA_COPY,
  stripAuthority,
  UI_MS,
} from "@eidolon/config";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CharacterRosterCard } from "@/components/characters/CharacterCard";
import { ImportCardButton } from "@/components/characters/ImportCardButton";
import { CharacterSettingsSheet } from "@/components/chat/CharacterSettingsSheet";
import { AppIcon } from "@/components/common/icon";
import { LoadingState } from "@/components/common/loading-state";
import { PressableScale } from "@/components/common/pressable-scale";
import { ThemeStudioSheet } from "@/components/theme/ThemeStudioSheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useConfirm } from "@/hooks/use-confirm";
import { useBarTopInset } from "@/lib/bar-inset";
import {
  ArrowRight01Icon,
  DashboardSquare01Icon,
  Logout01Icon,
  PaintBoardIcon,
  SparklesIcon,
  UserIcon,
} from "@/lib/icons";
import { useAuthStore, useIsOwner } from "@/store/auth-store";
import { type CharacterSummary, fetchCharacters } from "@/store/character-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const ACCOUNT_PX = 34;
const HEADER_TOP_PX = 6;

export default function MainCharactersScreen() {
  const router = useRouter();
  const { serverHost, sessionToken, signOut, connectionState } = useConnectionStore();
  const theme = useResolvedTheme();
  const barTop = useBarTopInset();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const isOwner = useIsOwner();
  const refreshAccount = useAuthStore((state) => state.refresh);
  const account = useAuthStore((state) => state.account);
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
      void refreshAccount(serverHost, sessionToken);
    }, [refreshAccount, serverHost, sessionToken]),
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
    connected: { color: theme.success, label: stripAuthority(serverHost) || "connected" },
    connecting: { color: theme.warning, label: CONNECTION_COPY.connecting },
    error: { color: theme.danger, label: CONNECTION_COPY.disconnected },
    disconnected: { color: theme.textMuted, label: CONNECTION_COPY.disconnected },
  }[connectionState];

  return (
    <View style={{ flex: 1, backgroundColor: theme.canvas }} className="flex-1 bg-canvas">
      {}
      <GlassSurface
        tint="canvas"
        className="flex-row items-center justify-between border-border border-b px-3 pb-2.5"
        style={{ paddingTop: barTop + HEADER_TOP_PX }}
      >
        <Text
          className="font-main-bold text-xl text-text-primary tracking-tight"
          style={{ flexShrink: 0, flexGrow: 0 }}
          numberOfLines={1}
        >
          Eidolon
        </Text>

        {}
        <View
          style={{ flexShrink: 1, minWidth: 0 }}
          className="mx-2.5 flex-1 flex-row items-center gap-2"
        >
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          <Text className="font-ui text-[11px] text-text-muted" numberOfLines={1}>
            {status.label}
          </Text>
        </View>

        {}
        <View className="shrink-0 flex-row items-center gap-2">
          {isOwner ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={DASHBOARD_COPY.title}
              hitSlop={6}
              className="items-center justify-center rounded-button p-2 active:bg-card"
              onPress={() => router.push("/(main)/admin")}
            >
              <AppIcon
                icon={DashboardSquare01Icon}
                size={18}
                color={theme.textMuted}
                strokeWidth={1.6}
              />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={HOME_COPY.lookTitle}
            hitSlop={6}
            className="items-center justify-center rounded-button p-2 active:bg-card"
            onPress={() => setShowThemeStudio(true)}
          >
            <AppIcon icon={PaintBoardIcon} size={18} color={theme.textMuted} strokeWidth={1.6} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              account ? `${HOME_COPY.accountLabel}: ${account.name}` : HOME_COPY.accountLabel
            }
            accessibilityState={{ expanded: showSettings }}
            hitSlop={6}
            className="ml-0.5 items-center justify-center overflow-hidden rounded-full border border-border bg-card active:bg-border"
            style={{ height: ACCOUNT_PX, width: ACCOUNT_PX }}
            onPress={() => setShowSettings((prev) => !prev)}
          >
            {account?.name ? (
              <Text className="font-main-bold text-[13px]" style={{ color: theme.textPrimary }}>
                {account.name.trim().slice(0, 1).toUpperCase()}
              </Text>
            ) : (
              <AppIcon icon={UserIcon} size={17} color={theme.textPrimary} strokeWidth={1.6} />
            )}
          </Pressable>
        </View>
      </GlassSurface>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 14, gap: 10 }}
      >
        {}
        {showSettings && (
          <Card className="border-primary/30">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="font-ui-bold text-sm text-text-primary" numberOfLines={1}>
                  {account?.name || HOME_COPY.signedOutAccount}
                </Text>
                {account?.email ? (
                  <Text className="font-ui text-[11px] text-text-muted" numberOfLines={1}>
                    {account.email}
                  </Text>
                ) : null}
                <Text className="mt-1 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                  {`${HOME_COPY.servedFrom} ${serverHost}`}
                </Text>
              </View>
              <Button
                variant="destructive"
                size="sm"
                className="flex-row gap-1.5"
                onPress={() =>
                  confirmation.ask({
                    title: CONFIRM_COPY.signOut,
                    body: CONFIRM_COPY.signOutBody,
                    confirmLabel: CONFIRM_COPY.signOutAction,
                    onConfirm: () => {
                      signOut();
                      router.replace("/(auth)/sign-in");
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

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={PERSONA_COPY.tile}
              onPress={() => router.push("/personas")}
              className="mt-3 flex-row items-center gap-2.5 rounded-button border border-border bg-input px-3 py-2.5"
            >
              <AppIcon icon={UserIcon} size={15} color={theme.primary} strokeWidth={1.6} />
              <View className="flex-1">
                <Text className="font-ui-bold text-[12.5px] text-text-primary">
                  {PERSONA_COPY.tile}
                </Text>
                <Text className="font-ui text-[10.5px] text-text-muted">{PERSONA_COPY.blurb}</Text>
              </View>
              <AppIcon icon={ArrowRight01Icon} size={14} color={theme.textMuted} />
            </PressableScale>
          </Card>
        )}

        {}
        <View className="flex-row items-center gap-2">
          <AppIcon icon={SparklesIcon} size={14} color={theme.textMuted} />
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
                    <Text className="flex-1 font-main-bold text-sm text-text-primary">
                      {DASHBOARD_COPY.title}
                    </Text>
                  </View>
                  <Text className="mt-1 font-ui text-xs text-text-muted">
                    {DASHBOARD_COPY.blurb}
                  </Text>
                </View>
                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0"
                  onPress={() => router.push("/(main)/admin")}
                >
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
                  <Text className="flex-1 font-main-bold text-sm text-text-primary">
                    {HOME_COPY.lookTitle}
                  </Text>
                </View>
                <Text className="mt-1 font-ui text-xs text-text-muted">{HOME_COPY.lookBlurb}</Text>
              </View>
              <Button
                variant="default"
                size="sm"
                className="shrink-0"
                onPress={() => setShowThemeStudio(true)}
              >
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
        characterId={managing?.id}
        characterName={managing?.name}
      />
    </View>
  );
}
