import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/store/theme-store";

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, placeholderTextColor, cursorColor, selectionColor, ...props }, ref) => {
    const { getResolvedTheme, activeCharacterId } = useThemeStore();
    const theme = getResolvedTheme(activeCharacterId ?? undefined);

    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? theme.textMuted}
        cursorColor={cursorColor ?? theme.primary}
        selectionColor={selectionColor ?? theme.primary}
        className={cn(
          "h-11 w-full rounded-input border border-border bg-input px-3 py-2 font-ui text-sm text-text-primary",
          "focus:border-primary",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
