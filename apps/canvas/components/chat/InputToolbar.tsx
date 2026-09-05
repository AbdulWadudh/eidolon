import { CHAT } from "@eidolon/config";
import type { IconSvgElement } from "@hugeicons/react-native";
import { View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import {
  AddCircleIcon,
  BookOpen01Icon,
  FlashIcon,
  Image01Icon,
  Mic01Icon,
  SmileIcon,
} from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export type ToolbarAction = "mood" | "gallery" | "voice" | "lorebook" | "action" | "more";

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
  { action: "lorebook", icon: BookOpen01Icon, label: "Open lorebook" },
  { action: "action", icon: FlashIcon, label: "Quick action" },
  { action: "more", icon: AddCircleIcon, label: "More actions" },
];

export interface InputToolbarProps {
  characterId?: string;
  onAction: (action: ToolbarAction) => void;
}

function ToolButton({
  spec,
  color,
  onAction,
}: {
  spec: ToolSpec;
  color: string;
  onAction: (action: ToolbarAction) => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={spec.label}
      hitSlop={CHAT.minTouchTargetPx / 4}
      onPress={() => onAction(spec.action)}
      className="h-8 w-8 items-center justify-center rounded-button"
    >
      <AppIcon icon={spec.icon} size={18} color={color} strokeWidth={1.8} />
    </PressableScale>
  );
}

export function InputToolbar({ characterId, onAction }: InputToolbarProps) {
  const theme = useResolvedTheme(characterId);

  return (
    <View className="mt-2 flex-row items-center justify-between border-border border-t pt-2">
      <View className="flex-row items-center gap-1">
        {LEFT_TOOLS.map((spec) => (
          <ToolButton key={spec.action} spec={spec} color={theme.textMuted} onAction={onAction} />
        ))}
      </View>
      <View className="flex-row items-center gap-1">
        {RIGHT_TOOLS.map((spec) => (
          <ToolButton key={spec.action} spec={spec} color={theme.textMuted} onAction={onAction} />
        ))}
      </View>
    </View>
  );
}
