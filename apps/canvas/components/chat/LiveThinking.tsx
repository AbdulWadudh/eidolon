import { CHAT_COPY, pronounsFor } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ArrowDown01Icon, ArrowUp01Icon, Brain02Icon } from "@/lib/icons";
import { useAffinityStore } from "@/store/affinity-store";
import { useResolvedTheme } from "@/store/theme-store";

const TAIL_CHARS = 560;
const TAIL_ROWS = 8;

export interface LiveThinkingProps {
  characterId?: string;
  reasoning: string;
}

export function LiveThinking({ characterId, reasoning }: LiveThinkingProps) {
  const theme = useResolvedTheme(characterId);
  const pronouns = useAffinityStore((state) => state.pronouns);
  const [open, setOpen] = React.useState(true);

  const subject = pronounsFor(pronouns).subject;
  const trimmed = reasoning.trim();
  const tail = trimmed.length > TAIL_CHARS ? trimmed.slice(-TAIL_CHARS) : trimmed;
  const label = open ? CHAT_COPY.hideThinking(subject) : CHAT_COPY.showThinking(subject);

  return (
    <View className="mb-2.5 border-border border-b pb-2.5">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        hitSlop={10}
        onPress={() => setOpen((shown) => !shown)}
        className="flex-row items-center gap-1.5"
      >
        <AppIcon icon={Brain02Icon} size={13} color={theme.primary} strokeWidth={1.8} />
        <Text className="font-ui text-text-muted text-xs">
          {open ? CHAT_COPY.thinkingTitle(subject) : label}
        </Text>
        <AppIcon
          icon={open ? ArrowUp01Icon : ArrowDown01Icon}
          size={13}
          color={theme.textMuted}
          strokeWidth={1.8}
        />
      </PressableScale>

      {open ? (
        <Text
          accessibilityLiveRegion="polite"
          numberOfLines={TAIL_ROWS}
          className="mt-1.5 font-ui text-[12px] text-text-primary leading-[17px]"
          style={{ opacity: 0.7 }}
        >
          {tail}
        </Text>
      ) : null}
    </View>
  );
}
