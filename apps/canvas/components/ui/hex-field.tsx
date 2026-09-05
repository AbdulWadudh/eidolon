import * as React from "react";
import { Input } from "@/components/ui/input";

export const HEX_PATTERN = /^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/;

export interface HexFieldProps {
  value: string;
  onCommit: (hex: string) => void;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Buffers the text locally and only writes a complete, valid hex to the store.
 *
 * A plain controlled `<Input value={token} onChangeText={write} />` writes on
 * every keystroke, so typing "#38BDF8" pushed seven separate theme updates -
 * six of them invalid colours - and re-rendered every themed node in between.
 * On Android that also fights the IME, because the value handed back to the
 * field is not the text that was typed.
 */
export function HexField({ value, onCommit, placeholder, maxLength = 9 }: HexFieldProps) {
  const [draft, setDraft] = React.useState(value);

  // Adopt external changes (presets, reset, mode switch) without clobbering
  // an in-progress entry that already matches the committed value.
  React.useEffect(() => {
    setDraft((prev) => (prev.toUpperCase() === value.toUpperCase() ? prev : value));
  }, [value]);

  const handleChangeText = React.useCallback(
    (text: string) => {
      let clean = text.trim().toUpperCase();
      if (clean.length > 0 && !clean.startsWith("#")) {
        clean = `#${clean}`;
      }
      setDraft(clean);
      if (HEX_PATTERN.test(clean)) {
        onCommit(clean);
      }
    },
    [onCommit],
  );

  return (
    <Input
      value={draft}
      onChangeText={handleChangeText}
      placeholder={placeholder}
      autoCapitalize="characters"
      autoCorrect={false}
      spellCheck={false}
      maxLength={maxLength}
    />
  );
}
