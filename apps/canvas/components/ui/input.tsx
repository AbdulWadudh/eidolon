import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { GlassSurface } from "@/components/ui/glass-surface";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/store/theme-store";

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, placeholderTextColor, cursorColor, selectionColor, ...props }, ref) => {
    const theme = useResolvedTheme();

    return (
      <GlassSurface tint="input" className={cn("w-full rounded-input", className)}>
        <TextInput
          ref={ref}
          {...props}
          placeholderTextColor={placeholderTextColor ?? theme.textMuted}
          cursorColor={cursorColor ?? theme.primary}
          selectionColor={selectionColor ?? theme.primary}
          style={[
            { paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" },
            props.style,
          ]}
          className={cn(
            "h-11 w-full rounded-input border border-border px-4 py-2 font-ui text-sm text-text-primary",
            "focus:border-primary",
          )}
        />
      </GlassSurface>
    );
  },
);

Input.displayName = "Input";
