import { CHAT } from "@eidolon/config";
import type * as React from "react";
import { TextInput, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon, SentIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";
import { InputToolbar, type ToolbarAction } from "./InputToolbar";

export const INPUT_PLACEHOLDER = "Message  ·  *action*  ·  <nudge her>";

export interface InputDockProps {
  value: string;
  isStreaming: boolean;
  characterId: string;
  inputRef?: React.RefObject<TextInput | null>;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onInterrupt: () => void;
  onAction: (action: ToolbarAction) => void;
}

export function InputDock({
  value,
  isStreaming,
  characterId,
  inputRef,
  onChangeText,
  onSend,
  onInterrupt,
  onAction,
}: InputDockProps) {
  const theme = useResolvedTheme(characterId);

  const canSend = value.trim().length > 0;
  const showStop = isStreaming && !canSend;

  return (
    <View className="mx-4 mb-3 rounded-card border border-border bg-input p-2.5">
      <View className="flex-row items-end gap-2">
        <TextInput
          ref={inputRef}
          accessibilityLabel="Message input"
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder={INPUT_PLACEHOLDER}
          placeholderTextColor={theme.textMuted}
          cursorColor={theme.primary}
          selectionColor={theme.primary}
          submitBehavior="newline"
          style={{
            flex: 1,
            maxHeight: 120,
            paddingVertical: 8,
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
          className="font-main text-base text-text-primary leading-normal"
        />

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={showStop ? "Stop the reply" : "Send message"}
          accessibilityState={{ disabled: !canSend && !showStop }}
          disabled={!canSend && !showStop}
          onPress={showStop ? onInterrupt : onSend}
          className="items-center justify-center rounded-button"
          style={{
            width: CHAT.sendButtonPx,
            height: CHAT.sendButtonPx,
            backgroundColor: showStop ? theme.secondary : theme.primary,
            opacity: canSend || showStop ? 1 : 0.4,
          }}
        >
          <AppIcon
            icon={showStop ? Cancel01Icon : SentIcon}
            size={18}
            color={showStop ? theme.textPrimary : theme.primaryForeground}
            strokeWidth={2}
          />
        </PressableScale>
      </View>

      <InputToolbar characterId={characterId} onAction={onAction} />
    </View>
  );
}
