import type { IconSvgElement } from "@hugeicons/react-native";
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { ArrowDown01Icon, ArrowUp01Icon } from "@/lib/icons";

export interface CollapsibleSectionProps {
  sectionKey: string;
  title: string;
  /** Optional leading icon shown before the title. */
  icon?: IconSvgElement;
  iconColor?: string;
  /** Rendered next to the chevron, e.g. the current token value. */
  badge?: React.ReactNode;
  /** Rendered outside the toggle, e.g. a per-token reset button. */
  action?: React.ReactNode;
  expanded: boolean;
  onToggle: (sectionKey: string) => void;
  chevronColor: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Collapsed sections are not rendered at all rather than hidden, so their native
 * views are unmounted. On a long controls screen that is the difference between
 * re-rendering every control on each token edit and re-rendering only the open one.
 */
export function CollapsibleSection({
  sectionKey,
  title,
  icon,
  iconColor,
  badge,
  action,
  expanded,
  onToggle,
  chevronColor,
  className = "rounded-card border border-border bg-card p-4",
  children,
}: CollapsibleSectionProps) {
  const handlePress = React.useCallback(() => onToggle(sectionKey), [onToggle, sectionKey]);

  return (
    <View className={className}>
      {/* `action` sits outside the toggle so its own presses are not swallowed
          by the header Pressable. */}
      <View className="flex-row items-center gap-2">
        <Pressable
          className="flex-1 flex-row items-center gap-2"
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          {icon ? <AppIcon icon={icon} size={16} color={iconColor ?? chevronColor} /> : null}
          <Text className="flex-1 font-ui-bold text-xs uppercase tracking-wider text-text-muted">
            {title}
          </Text>
          {badge}
          <AppIcon
            icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
            size={16}
            color={chevronColor}
          />
        </Pressable>
        {action}
      </View>
      {expanded ? <View className="mt-3">{children}</View> : null}
    </View>
  );
}
