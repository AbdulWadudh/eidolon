import * as React from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/store/theme-store";

export interface InputProps extends TextInputProps {
  className?: string;
}

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, placeholderTextColor, cursorColor, selectionColor, ...props }, ref) => {
    const theme = useResolvedTheme();

    return (
      <TextInput
        ref={ref}
        placeholderTextColor={placeholderTextColor ?? theme.textMuted}
        cursorColor={cursorColor ?? theme.primary}
        selectionColor={selectionColor ?? theme.primary}
        // Android adds font padding on top of the line box and centres by
        // baseline, which clips custom-font glyphs inside a fixed-height field.
        style={[
          { paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" },
          props.style,
        ]}
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
