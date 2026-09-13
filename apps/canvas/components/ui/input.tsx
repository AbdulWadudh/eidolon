import { AUTH_COPY } from "@eidolon/config";
import type { IconSvgElement } from "@hugeicons/react-native";
import * as React from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { ViewIcon, ViewOffIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { select } from "@/services/haptics";
import { useResolvedTheme } from "@/store/theme-store";

export interface InputProps extends TextInputProps {
  className?: string;
  leading?: IconSvgElement;
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, leading, placeholderTextColor, cursorColor, selectionColor, ...props }, ref) => {
    const theme = useResolvedTheme();
    const [isRevealed, setRevealed] = React.useState(false);
    const isMasked = props.secureTextEntry === true;

    return (
      <GlassSurface tint="input" className={cn("relative w-full rounded-input", className)}>
        <TextInput
          ref={ref}
          {...props}
          secureTextEntry={isMasked && !isRevealed}
          placeholderTextColor={placeholderTextColor ?? theme.textMuted}
          cursorColor={cursorColor ?? theme.primary}
          selectionColor={selectionColor ?? theme.primary}
          style={[
            {
              paddingVertical: 0,
              includeFontPadding: false,
              textAlignVertical: "center",
              borderWidth: theme.borderWidth,
            },
            props.style,
          ]}
          className={cn(
            "h-11 w-full rounded-input border border-border px-4 py-2 font-ui text-sm text-text-primary",
            isMasked && "pr-12",
            leading !== undefined && "pl-11",
            "focus:border-primary",
          )}
        />

        {leading !== undefined ? (
          <View
            pointerEvents="none"
            className="absolute top-0 left-0 h-11 w-11 items-center justify-center"
          >
            <AppIcon icon={leading} size={16} color={theme.textMuted} />
          </View>
        ) : null}

        {isMasked ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? AUTH_COPY.hidePassword : AUTH_COPY.showPassword}
            accessibilityState={{ expanded: isRevealed }}
            hitSlop={8}
            onPress={() => {
              select();
              setRevealed((prev) => !prev);
            }}
            className="absolute top-0 right-0 h-11 w-11 items-center justify-center"
          >
            <AppIcon
              icon={isRevealed ? ViewOffIcon : ViewIcon}
              size={16}
              color={isRevealed ? theme.primary : theme.textMuted}
            />
          </PressableScale>
        ) : null}
      </GlassSurface>
    );
  },
);

Input.displayName = "Input";
