import { Pressable } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { ArrowReloadHorizontalIcon } from "@/lib/icons";

export interface ResetTokenButtonProps {
  onPress: () => void;
  /** Dimmed and inert when the token already holds its default value. */
  isDefault: boolean;
  color: string;
  accessibilityLabel: string;
  size?: number;
}

export function ResetTokenButton({
  onPress,
  isDefault,
  color,
  accessibilityLabel,
  size = 28,
}: ResetTokenButtonProps) {
  return (
    <Pressable
      className="items-center justify-center rounded border border-border bg-input active:bg-border"
      style={{ width: size, height: size, opacity: isDefault ? 0.35 : 1 }}
      onPress={onPress}
      disabled={isDefault}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDefault }}
    >
      <AppIcon icon={ArrowReloadHorizontalIcon} size={Math.round(size * 0.55)} color={color} />
    </Pressable>
  );
}
