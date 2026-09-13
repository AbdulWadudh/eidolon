import { MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AffinitySection } from "@/components/chat/mind/AffinitySection";
import { ChronicleSection } from "@/components/chat/mind/ChronicleSection";
import { LoreSection } from "@/components/chat/mind/LoreSection";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SwitchRow } from "@/components/ui/switch";
import { useVoice } from "@/hooks/use-voice";
import { useAffinityStore } from "@/store/affinity-store";
import {
  createChapter,
  createLore,
  fetchMind,
  type LoreDraft,
  type MindView,
  patchAffinity,
  removeChapter,
  removeLore,
  updateChapter,
  updateLore,
} from "@/store/mind-api";

export interface MindDrawerProps {
  isOpen: boolean;
  characterId: string;
  serverHost: string;
  onClose: () => void;
}

export function MindDrawer({ isOpen, characterId, serverHost, onClose }: MindDrawerProps) {
  const reduced = useReducedMotion();
  const say = useVoice();
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

  const apply = React.useCallback((next: MindView | null) => {
    if (next) setView(next);
  }, []);

  const saveChapter = React.useCallback(
    (chapterId: string | null, summaryText: string) => {
      const request = chapterId
        ? updateChapter(serverHost, characterId, chapterId, summaryText)
        : createChapter(serverHost, characterId, summaryText);
      void Promise.resolve(request).then(apply);
    },
    [serverHost, characterId, apply],
  );

  const dropChapter = React.useCallback(
    (chapterId: string) => {
      void Promise.resolve(removeChapter(serverHost, characterId, chapterId)).then(apply);
    },
    [serverHost, characterId, apply],
  );

  const saveLore = React.useCallback(
    (entryId: string | null, draft: LoreDraft) => {
      const request = entryId
        ? updateLore(serverHost, characterId, entryId, draft)
        : createLore(serverHost, characterId, draft);
      void Promise.resolve(request).then(apply);
    },
    [serverHost, characterId, apply],
  );

  const dropLore = React.useCallback(
    (entryId: string) => {
      void Promise.resolve(removeLore(serverHost, characterId, entryId)).then(apply);
    },
    [serverHost, characterId, apply],
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
        style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={MIND_COPY.closeLabel}
          className="flex-1"
          onPress={onClose}
        />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="max-h-[86%] overflow-hidden rounded-t-card border-border border-t"
        >
          <GlassSurface tint="card" overlay pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View className="flex-row items-start justify-between border-border border-b px-4 py-4">
            <View className="flex-1 pr-3">
              <Text className="font-main-bold text-base text-text-primary">
                {MIND_COPY.drawerTitle}
              </Text>
              <Text className="mt-0.5 font-ui text-[11px] text-text-muted">
                {say(MIND_COPY.drawerSubtitle)}
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
              hint={say(MIND_COPY.insightHint)}
              value={isInsightModeEnabled}
              onValueChange={setInsightMode}
              accessibilityLabel={MIND_COPY.insightToggle}
            />

            <SwitchRow
              characterId={characterId}
              label={MIND_COPY.searchToggle}
              hint={say(MIND_COPY.searchHint)}
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
                <LoreSection
                  characterId={characterId}
                  entries={view?.lore ?? []}
                  serverHost={serverHost}
                  onSave={saveLore}
                  onDelete={dropLore}
                />
                <View className="h-px bg-border" />
                <ChronicleSection
                  characterId={characterId}
                  chapters={view?.chapters ?? []}
                  serverHost={serverHost}
                  onSave={saveChapter}
                  onDelete={dropChapter}
                />
              </>
            )}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
