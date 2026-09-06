import { AFFINITY_HUD, affinityLabel, EASING_BEZIER, MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { type GestureResponderEvent, Text, View } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { SquareLock01Icon, SquareUnlock01Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface AffinitySectionProps {
  characterId: string;
  score: number;
  tier: string;
  isLocked: boolean;
  onScoreChange: (score: number) => void;
  onScoreCommit: (score: number) => void;
  onToggleLock: (locked: boolean) => void;
}

function clamp(score: number): number {
  return Math.max(0, Math.min(AFFINITY_HUD.scaleMax, Math.round(score)));
}

export function AffinitySection({
  characterId,
  score,
  tier,
  isLocked,
  onScoreChange,
  onScoreCommit,
  onToggleLock,
}: AffinitySectionProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = React.useState(0);
  const percent = (clamp(score) / AFFINITY_HUD.scaleMax) * 100;

  const setFromTouch = React.useCallback(
    (event: GestureResponderEvent) => {
      if (trackWidth <= 0) return;
      const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / trackWidth));
      onScoreChange(clamp(ratio * AFFINITY_HUD.scaleMax));
    },
    [trackWidth, onScoreChange],
  );

  // A drag is not the only way in: WCAG 2.2 requires a single-pointer
  // alternative, and the stepper doubles as the screen reader path.
  const step = React.useCallback(
    (direction: 1 | -1) => {
      const next = clamp(score + direction * AFFINITY_HUD.sliderStepPercent);
      onScoreChange(next);
      onScoreCommit(next);
    },
    [score, onScoreChange, onScoreCommit],
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
          {MIND_COPY.affinityHeading}
        </Text>
        <Text className="font-ui-bold text-primary text-sm">{affinityLabel(tier, score)}</Text>
      </View>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={MIND_COPY.affinityHeading}
        accessibilityHint={MIND_COPY.affinityHint}
        accessibilityValue={{ min: 0, max: AFFINITY_HUD.scaleMax, now: clamp(score) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") step(1);
          if (event.nativeEvent.actionName === "decrement") step(-1);
        }}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={setFromTouch}
        onResponderMove={setFromTouch}
        onResponderRelease={() => onScoreCommit(clamp(score))}
        style={{ paddingVertical: 12 }}
      >
        <View
          className="w-full overflow-hidden rounded-full bg-input"
          style={{ height: AFFINITY_HUD.progressTrackHeightPx }}
        >
          <Animated.View
            className="h-full rounded-full"
            style={{
              width: `${percent}%`,
              backgroundColor: theme.primary,
              transitionProperty: reduced ? undefined : "width",
              transitionDuration: reduced ? 0 : UI_MS.disclosure,
              transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
            }}
          />
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Lower ${MIND_COPY.affinityHeading}`}
          hitSlop={8}
          onPress={() => step(-1)}
          className="h-11 w-11 items-center justify-center rounded-button border border-border bg-input"
        >
          <Text className="font-ui-bold text-base text-text-primary">−</Text>
        </PressableScale>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Raise ${MIND_COPY.affinityHeading}`}
          hitSlop={8}
          onPress={() => step(1)}
          className="h-11 w-11 items-center justify-center rounded-button border border-border bg-input"
        >
          <Text className="font-ui-bold text-base text-text-primary">+</Text>
        </PressableScale>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={isLocked ? MIND_COPY.lockOn : MIND_COPY.lockOff}
          accessibilityState={{ selected: isLocked }}
          onPress={() => onToggleLock(!isLocked)}
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-button border bg-input px-3"
          style={{ borderColor: isLocked ? theme.primary : theme.cardBorder }}
        >
          <AppIcon
            icon={isLocked ? SquareLock01Icon : SquareUnlock01Icon}
            size={17}
            color={isLocked ? theme.primary : theme.textMuted}
            strokeWidth={1.8}
          />
          <Text
            className="font-ui-medium text-xs"
            style={{ color: isLocked ? theme.primary : theme.textMuted }}
            numberOfLines={1}
          >
            {isLocked ? MIND_COPY.lockOn : MIND_COPY.lockOff}
          </Text>
        </PressableScale>
      </View>

      {isLocked ? (
        <Text className="font-ui text-[11px] text-text-muted">{MIND_COPY.lockedNote}</Text>
      ) : null}
    </View>
  );
}
