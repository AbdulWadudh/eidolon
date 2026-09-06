import { MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AffinitySection } from "@/components/chat/mind/AffinitySection";
import { ChronicleSection } from "@/components/chat/mind/ChronicleSection";
import { LoreSection } from "@/components/chat/mind/LoreSection";
import { PressableScale } from "@/components/common/pressable-scale";
import { SwitchRow } from "@/components/ui/switch";
import { useAffinityStore } from "@/store/affinity-store";
import { fetchMind, type MindView, patchAffinity } from "@/store/mind-api";

export interface MindDrawerProps {
  isOpen: boolean;
  characterId: string;
  serverHost: string;
  onClose: () => void;
}

export function MindDrawer({ isOpen, characterId, serverHost, onClose }: MindDrawerProps) {
  const reduced = useReducedMotion();
  const [view, setView] = React.useState<MindView | null>(null);
  const [failed, setFailed] = React.useState(false);

  const score = useAffinityStore((state) => state.affinityScore);
  const tier = useAffinityStore((state) => state.affinityTier);
  const isLocked = useAffinityStore((state) => state.isAffinityLocked);
  const isInsightModeEnabled = useAffinityStore((state) => state.isInsightModeEnabled);
  const allowWebSearch = useAffinityStore((state) => state.allowWebSearch);
  const setInsightMode = useAffinityStore((state) => state.setInsightMode);
  const setAllowWebSearch = useAffinityStore((state) => state.setAllowWebSearch);
  const setManualAffinity = useAffinityStore((state) => state.setManualAffinity);
  const setAffinityLock = useAffinityStore((state) => state.setAffinityLock);

  const load = React.useCallback(async () => {
    const next = await fetchMind(serverHost, characterId);
    setView(next);
    setFailed(next === null);
  }, [serverHost, characterId]);

  React.useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  const commitScore = React.useCallback(
    (value: number) => {
      void patchAffinity(serverHost, characterId, { score: value }).then((next) => {
        if (next) setView(next);
      });
    },
    [serverHost, characterId],
  );

  const toggleLock = React.useCallback(
    (locked: boolean) => {
      setAffinityLock(locked);
      void patchAffinity(serverHost, characterId, { locked }).then((next) => {
        if (next) setView(next);
      });
    },
    [serverHost, characterId, setAffinityLock],
  );

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={MIND_COPY.closeLabel}
          className="flex-1"
          onPress={onClose}
        />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="max-h-[86%] rounded-t-card border-border border-t bg-card"
        >
          <View className="flex-row items-start justify-between border-border border-b px-4 py-4">
            <View className="flex-1 pr-3">
              <Text className="font-main-bold text-base text-text-primary">
                {MIND_COPY.drawerTitle}
              </Text>
              <Text className="mt-0.5 font-ui text-[11px] text-text-muted">
                {MIND_COPY.drawerSubtitle}
              </Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={MIND_COPY.closeLabel}
              hitSlop={12}
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full border border-border"
            >
              <Text className="font-ui text-sm text-text-muted">✕</Text>
            </PressableScale>
          </View>

          <ScrollView
            className="px-4"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <AffinitySection
              characterId={characterId}
              score={score}
              tier={tier}
              isLocked={isLocked}
              onScoreChange={setManualAffinity}
              onScoreCommit={commitScore}
              onToggleLock={toggleLock}
            />

            <View className="h-px bg-border" />

            <SwitchRow
              characterId={characterId}
              label={MIND_COPY.insightToggle}
              hint={MIND_COPY.insightHint}
              value={isInsightModeEnabled}
              onValueChange={setInsightMode}
              accessibilityLabel={MIND_COPY.insightToggle}
            />

            <SwitchRow
              characterId={characterId}
              label={MIND_COPY.searchToggle}
              hint={MIND_COPY.searchHint}
              value={allowWebSearch}
              onValueChange={setAllowWebSearch}
              accessibilityLabel={MIND_COPY.searchToggle}
            />

            <View className="h-px bg-border" />

            {failed ? (
              <View className="gap-2">
                <Text className="font-ui text-text-muted text-xs">{MIND_COPY.loadFailed}</Text>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={MIND_COPY.retryLabel}
                  onPress={() => void load()}
                  className="h-11 items-center justify-center rounded-button border border-border bg-input"
                >
                  <Text className="font-ui-medium text-text-primary text-xs">
                    {MIND_COPY.retryLabel}
                  </Text>
                </PressableScale>
              </View>
            ) : (
              <>
                <LoreSection characterId={characterId} entries={view?.lore ?? []} />
                <View className="h-px bg-border" />
                <ChronicleSection characterId={characterId} chapters={view?.chapters ?? []} />
              </>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
