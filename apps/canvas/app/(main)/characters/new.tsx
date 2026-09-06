import { CHARACTER_COPY, UI_MS } from "@eidolon/config";
import { useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { CharacterForm, type Draft, EMPTY_DRAFT } from "@/components/characters/CharacterForm";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { ArrowLeft01Icon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import {
  createCharacter,
  createFromPreset,
  fetchPresets,
  type Preset,
} from "@/store/character-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function NewCharacterScreen() {
  const router = useRouter();
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const serverHost = useConnectionStore((state) => state.serverHost);

  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    void fetchPresets(serverHost).then(setPresets);
  }, [serverHost]);

  const change = React.useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const applyPreset = React.useCallback(
    async (preset: Preset) => {
      setBusy(true);
      const created = await createFromPreset(serverHost, preset.key);
      setBusy(false);

      if (!created) {
        setFailed(true);
        return;
      }

      tap("success");
      router.replace(`/chat/${created.id}`);
    },
    [serverHost, router],
  );

  const save = React.useCallback(async () => {
    if (draft.name.trim().length === 0) return;

    setBusy(true);
    const created = await createCharacter(serverHost, { ...draft, name: draft.name });
    setBusy(false);

    if (!created) {
      setFailed(true);
      return;
    }

    tap("success");
    router.replace(`/chat/${created.id}`);
  }, [draft, serverHost, router]);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
      className="flex-1 bg-canvas"
    >
      <View className="flex-row items-center gap-3 border-border border-b px-4 py-3">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={CHARACTER_COPY.cancel}
          hitSlop={8}
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-button border border-border bg-card"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={theme.textPrimary} />
        </PressableScale>
        <Text className="flex-1 font-main-bold text-lg text-text-primary">
          {CHARACTER_COPY.createTitle}
        </Text>
      </View>

      <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-3">
            <View>
              <Text className="font-main-bold text-base text-text-primary">
                {CHARACTER_COPY.presetsTitle}
              </Text>
              <Text className="mt-0.5 font-ui text-[11px] text-text-muted">
                {CHARACTER_COPY.presetsBlurb}
              </Text>
            </View>

            {presets.map((preset) => (
              <PressableScale
                key={preset.key}
                accessibilityRole="button"
                accessibilityLabel={`${preset.label}: ${preset.name}`}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void applyPreset(preset)}
                className="rounded-card border border-border bg-input px-3 py-3"
                style={{ opacity: busy ? 0.5 : 1 }}
              >
                <View className="flex-row items-baseline justify-between gap-2">
                  <Text className="font-ui-bold text-primary text-xs uppercase tracking-[1.2px]">
                    {preset.label}
                  </Text>
                  <Text className="font-ui text-[11px] text-text-muted">{preset.name}</Text>
                </View>
                <Text className="mt-1 font-main text-sm text-text-primary">{preset.blurb}</Text>
              </PressableScale>
            ))}
          </View>

          <View className="h-px bg-border" />

          <Text className="font-main-bold text-base text-text-primary">
            {CHARACTER_COPY.fromBlank}
          </Text>

          <CharacterForm draft={draft} serverHost={serverHost} onChange={change} />

          {failed ? (
            <Animated.Text
              entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
              accessibilityLiveRegion="polite"
              className="font-ui text-danger text-xs"
            >
              {CHARACTER_COPY.failed}
            </Animated.Text>
          ) : null}

          <Button
            variant="default"
            size="default"
            className="w-full"
            disabled={busy || draft.name.trim().length === 0}
            onPress={() => void save()}
          >
            {busy ? CHARACTER_COPY.creating : CHARACTER_COPY.create}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
