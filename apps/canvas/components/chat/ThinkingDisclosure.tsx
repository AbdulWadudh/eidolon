import { CHAT_COPY, EASING_BEZIER, pronounsFor, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { cubicBezier, FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ArrowDown01Icon, ArrowUp01Icon, Brain02Icon } from "@/lib/icons";
import { useAffinityStore } from "@/store/affinity-store";
import { useResolvedTheme } from "@/store/theme-store";

export interface ThinkingDisclosureProps {
  characterId: string;
  reasoning: string;
  children?: React.ReactNode;
}

export function ThinkingDisclosure({ characterId, reasoning, children }: ThinkingDisclosureProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [shown, setShown] = React.useState(false);
  const pronouns = useAffinityStore((state) => state.pronouns);

  const subject = pronounsFor(pronouns).subject;
  const trimmed = reasoning.trim();
  const label = shown ? CHAT_COPY.hideThinking(subject) : CHAT_COPY.showThinking(subject);

  return (
    <View>
      <View className="mt-2.5 flex-row items-center justify-between gap-3">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded: shown }}
          hitSlop={10}
          onPress={() => setShown((open) => !open)}
          className="flex-row items-center gap-1.5"
        >
          <AppIcon icon={Brain02Icon} size={13} color={theme.textMuted} strokeWidth={1.8} />
          <Text className="font-ui text-text-muted text-xs">{label}</Text>
          <AppIcon
            icon={shown ? ArrowUp01Icon : ArrowDown01Icon}
            size={13}
            color={theme.textMuted}
            strokeWidth={1.8}
          />
        </PressableScale>

        {children}
      </View>

      {shown ? (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          style={{ transitionTimingFunction: cubicBezier(...EASING_BEZIER.out) }}
          className="mt-2.5 border-border border-t pt-2.5"
        >
          <Text className="font-ui-bold text-[10px] text-text-muted uppercase tracking-[1.5px]">
            {CHAT_COPY.thinkingTitle(subject)}
          </Text>
          <Text
            className="mt-1.5 font-ui text-[12px] text-text-primary leading-[17px]"
            style={{ opacity: 0.7 }}
          >
            {trimmed}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
