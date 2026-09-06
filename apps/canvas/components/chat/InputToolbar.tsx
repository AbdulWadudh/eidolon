import { CHAT, EASING_BEZIER, ENHANCE_COPY, MIND_COPY, UI_MS } from "@eidolon/config";
import type { IconSvgElement } from "@hugeicons/react-native";
import { View } from "react-native";
import Animated, { cubicBezier, FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import {
  AddCircleIcon,
  BookOpen01Icon,
  FlashIcon,
  Image01Icon,
  MagicWand01Icon,
  Mic01Icon,
  SmileIcon,
  Undo02Icon,
} from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export type ToolbarAction =
  | "mood"
  | "gallery"
  | "voice"
  | "lorebook"
  | "suggestions"
  | "enhance"
  | "revert"
  | "more";

interface ToolSpec {
  action: ToolbarAction;
  icon: IconSvgElement;
  label: string;
}

const LEFT_TOOLS: ToolSpec[] = [
  { action: "mood", icon: SmileIcon, label: "Set mood" },
  { action: "gallery", icon: Image01Icon, label: "Request a selfie" },
  { action: "voice", icon: Mic01Icon, label: "Record a voice note" },
];

const RIGHT_TOOLS: ToolSpec[] = [
  { action: "lorebook", icon: BookOpen01Icon, label: MIND_COPY.drawerTitle },
  { action: "suggestions", icon: FlashIcon, label: "Reply suggestions" },
  { action: "more", icon: AddCircleIcon, label: "More actions" },
];

const TOOL_GAP = CHAT.toolGapPx;
const SIDE_SLOP = TOOL_GAP / 2;
const VERTICAL_SLOP = (CHAT.minTouchTargetPx - CHAT.toolButtonPx) / 2;
const TOOL_HIT_SLOP = {
  top: VERTICAL_SLOP,
  bottom: VERTICAL_SLOP,
  left: SIDE_SLOP,
  right: SIDE_SLOP,
};

export interface InputToolbarProps {
  characterId?: string;
  suggestionsOpen?: boolean;
  canEnhance?: boolean;
  isEnhancing?: boolean;
  revertSteps?: number;
  onAction: (action: ToolbarAction) => void;
}

function ToolButton({
  spec,
  color,
  active,
  activeColor,
  disabled,
  busy,
  onAction,
}: {
  spec: ToolSpec;
  color: string;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  busy?: boolean;
  onAction: (action: ToolbarAction) => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={spec.label}
      accessibilityState={{
        ...(active === undefined ? {} : { selected: active }),
        ...(disabled ? { disabled: true } : {}),
        ...(busy ? { busy: true } : {}),
      }}
      disabled={disabled}
      hitSlop={TOOL_HIT_SLOP}
      onPress={() => onAction(spec.action)}
      className="items-center justify-center rounded-button"
      style={{
        width: CHAT.toolButtonPx,
        height: CHAT.toolButtonPx,
        backgroundColor: active ? `${activeColor}22` : undefined,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <AppIcon
        icon={spec.icon}
        size={CHAT.toolIconPx}
        color={active ? (activeColor ?? color) : color}
        strokeWidth={active ? 2.4 : 1.8}
      />
    </PressableScale>
  );
}

export function InputToolbar({
  characterId,
  suggestionsOpen,
  canEnhance = false,
  isEnhancing = false,
  revertSteps = 0,
  onAction,
}: InputToolbarProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <View className="mt-2 flex-row items-center justify-between border-border border-t pt-2">
      <View className="flex-row items-center" style={{ gap: TOOL_GAP }}>
        {LEFT_TOOLS.map((spec) => (
          <ToolButton key={spec.action} spec={spec} color={theme.textMuted} onAction={onAction} />
        ))}
      </View>
      <View className="flex-row items-center" style={{ gap: TOOL_GAP }}>
        {revertSteps > 0 ? (
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
            exiting={reduced ? undefined : FadeOut.duration(UI_MS.pressFeedback)}
          >
            <ToolButton
              spec={{
                action: "revert",
                icon: Undo02Icon,
                label: ENHANCE_COPY.revertCount(revertSteps),
              }}
              color={theme.textMuted}
              disabled={isEnhancing}
              onAction={onAction}
            />
          </Animated.View>
        ) : null}

        <Animated.View
          accessibilityLiveRegion={isEnhancing ? "polite" : "none"}
          style={{
            opacity: isEnhancing ? 0.55 : 1,
            transitionProperty: "opacity",
            transitionDuration: reduced ? 0 : UI_MS.disclosure,
            transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
          }}
        >
          <ToolButton
            spec={{
              action: "enhance",
              icon: MagicWand01Icon,
              label: isEnhancing ? ENHANCE_COPY.working : ENHANCE_COPY.action,
            }}
            color={theme.textMuted}
            active={isEnhancing}
            activeColor={theme.primary}
            disabled={!canEnhance || isEnhancing}
            busy={isEnhancing}
            onAction={onAction}
          />
        </Animated.View>

        {RIGHT_TOOLS.map((spec) => (
          <ToolButton
            key={spec.action}
            spec={spec}
            color={theme.textMuted}
            active={spec.action === "suggestions" ? suggestionsOpen : undefined}
            activeColor={theme.primary}
            onAction={onAction}
          />
        ))}
      </View>
    </View>
  );
}
