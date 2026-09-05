import { UI_MS } from "@eidolon/config";
import type { IconSvgElement } from "@hugeicons/react-native";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import {
  AddCircleIcon,
  BookOpen01Icon,
  Call02Icon,
  FlashIcon,
  Image01Icon,
  RefreshIcon,
  SparklesIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/store/theme-store";

export type ChatAction = "reset" | "call" | "image" | "lorebook" | "outfit" | "moment" | "replies";

interface ActionSpec {
  action: ChatAction;
  icon: IconSvgElement;
  label: string;
  badge?: string;
  ready: boolean;
  destructive?: boolean;
}

const ACTIONS: ActionSpec[] = [
  { action: "reset", icon: RefreshIcon, label: "Reset", ready: true, destructive: true },
  { action: "replies", icon: SparklesIcon, label: "Replies", ready: true },
  { action: "call", icon: Call02Icon, label: "Voice call", badge: "Soon", ready: false },
  { action: "image", icon: Image01Icon, label: "Selfie", badge: "Soon", ready: false },
  { action: "lorebook", icon: BookOpen01Icon, label: "Lorebook", badge: "Soon", ready: false },
  { action: "outfit", icon: FlashIcon, label: "Outfit", badge: "Soon", ready: false },
  { action: "moment", icon: AddCircleIcon, label: "Moment", badge: "Soon", ready: false },
];

export interface ActionsSheetProps {
  isOpen: boolean;
  characterId: string;
  repliesHidden: boolean;
  onClose: () => void;
  onAction: (action: ChatAction) => void;
}

export function ActionsSheet({
  isOpen,
  characterId,
  repliesHidden,
  onClose,
  onAction,
}: ActionsSheetProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <Pressable accessibilityLabel="Close menu" className="flex-1" onPress={onClose} />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="rounded-t-card border-border border-t bg-card px-4 pt-4 pb-8"
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
              More actions
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              hitSlop={12}
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full border border-border"
            >
              <Text className="font-ui text-sm text-text-muted">✕</Text>
            </PressableScale>
          </View>

          <View className="flex-row flex-wrap">
            {ACTIONS.map((spec) => {
              const label =
                spec.action === "replies"
                  ? repliesHidden
                    ? "Show replies"
                    : "Hide replies"
                  : spec.label;

              return (
                <View key={spec.action} className="w-1/4 items-center py-2">
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={spec.ready ? label : `${label}, not available yet`}
                    accessibilityState={{ disabled: !spec.ready }}
                    disabled={!spec.ready}
                    onPress={() => onAction(spec.action)}
                    className={cn(
                      "h-16 w-16 items-center justify-center rounded-card border bg-input",
                      spec.destructive ? "border-danger/40" : "border-border",
                    )}
                    style={{ opacity: spec.ready ? 1 : 0.4 }}
                  >
                    <AppIcon
                      icon={spec.icon}
                      size={22}
                      color={spec.destructive ? theme.danger : theme.primary}
                      strokeWidth={1.8}
                    />
                  </PressableScale>

                  <Text
                    className="mt-1.5 text-center font-ui text-[11px] text-text-muted"
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  {spec.badge ? (
                    <Text className="font-ui text-[9px] text-text-muted opacity-70">
                      {spec.badge}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
