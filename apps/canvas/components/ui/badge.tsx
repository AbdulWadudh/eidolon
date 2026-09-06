import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Text, View, type ViewProps } from "react-native";
import { cn, isTextualChildren } from "@/lib/utils";

/**
 * The pill's inner height. The text's line box is set to match it so the glyphs
 * centre regardless of how much descent the font reserves.
 */
const BADGE_HEIGHT = 18;

const badgeVariants = cva(
  "flex-row items-center justify-center gap-1.5 rounded-button px-2.5 py-1 border border-border",
  {
    variants: {
      variant: {
        default: "bg-card",
        success: "bg-card border-success/40",
        warning: "bg-card border-warning/40",
        danger: "bg-card border-danger/40",
        muted: "bg-input border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const badgeTextVariants = cva("font-ui-bold text-xs tracking-wide", {
  variants: {
    variant: {
      default: "text-text-primary",
      success: "text-success",
      warning: "text-warning",
      danger: "text-danger",
      muted: "text-text-muted",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
  textClassName?: string;
}

export function Badge({ className, textClassName, variant, children, ...props }: BadgeProps) {
  const isTextual = isTextualChildren(children);

  return (
    <View className={cn(badgeVariants({ variant, className }))} {...props}>
      {isTextual ? (
        <Text
          className={cn(badgeTextVariants({ variant, className: textClassName }))}
          // A pill holding only digits sat high in it. Dropping Android's extra
          // font padding is not enough on its own: the font still reserves the
          // space under the baseline that a descender would use, and a digit has
          // none, so the glyph rides above the middle. Giving the line box the
          // pill's full height and centring in it puts the digits where the eye
          // expects them, whatever the font's own metrics say.
          style={{
            includeFontPadding: false,
            textAlignVertical: "center",
            lineHeight: BADGE_HEIGHT,
            height: BADGE_HEIGHT,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
