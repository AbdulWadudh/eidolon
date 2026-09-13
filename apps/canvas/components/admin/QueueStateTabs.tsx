import { EASING_BEZIER, UI_MS } from "@eidolon/config";
import { ScrollView, Text, View } from "react-native";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { PressableScale } from "@/components/common/pressable-scale";
import { countFor, QUEUE_TAB_LABELS, QUEUE_TABS, type QueueTab } from "@/lib/queue-tabs";
import { select } from "@/services/haptics";
import type { QueueView } from "@/store/admin-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface QueueStateTabsProps {
  queue: QueueView;
  value: QueueTab;
  onChange: (next: QueueTab) => void;
}

export function QueueStateTabs({ queue, value, onChange }: QueueStateTabsProps) {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();

  const tint: Record<QueueTab, string> = {
    pending: theme.primary,
    active: theme.primary,
    waiting: theme.textMuted,
    delayed: theme.warning,
    failed: theme.danger,
    completed: theme.success,
  };

  const motion = reduced
    ? {}
    : {
        transitionProperty: ["backgroundColor", "borderColor"] as const,
        transitionDuration: UI_MS.disclosure,
        transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
      };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
      accessibilityRole="tablist"
      accessibilityLabel={queue.name}
    >
      {QUEUE_TABS.map((tab) => {
        const isActive = tab === value;
        const count = countFor(queue, tab);
        const colour = tint[tab];

        return (
          <PressableScale
            key={tab}
            accessibilityRole="tab"
            accessibilityLabel={`${QUEUE_TAB_LABELS[tab]} ${count}`}
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (isActive) return;
              select();
              onChange(tab);
            }}
          >
            <Animated.View
              className="flex-row items-center gap-1.5 rounded-button border px-2.5 py-1.5"
              style={{
                backgroundColor: isActive ? colour : theme.inputSurface,
                borderColor: isActive ? colour : theme.cardBorder,
                ...motion,
              }}
            >
              {isActive ? null : (
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: count > 0 ? colour : theme.cardBorder }}
                />
              )}

              <Text
                numberOfLines={1}
                className="font-ui-medium text-[10px]"
                style={{ color: isActive ? theme.primaryForeground : theme.textMuted }}
              >
                {QUEUE_TAB_LABELS[tab]}
              </Text>

              <Text
                numberOfLines={1}
                className="font-ui-bold text-[10px]"
                style={{ color: isActive ? theme.primaryForeground : colour }}
              >
                {count}
              </Text>
            </Animated.View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
