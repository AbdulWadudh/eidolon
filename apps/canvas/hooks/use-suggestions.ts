import * as React from "react";
import type { TextInput } from "react-native";
import type { ChatView } from "@/hooks/use-chat-view";
import { isSuggestionTrayVisible } from "@/store/chat-selectors";
import { useChatStore } from "@/store/chat-store";

export interface SuggestionActions {
  isTrayVisible: boolean;
  send: (text: string) => void;
  edit: (text: string) => void;
  reroll: () => void;
  hide: () => void;
  toggle: () => void;
}

/**
 * The reply tray's behaviour, kept off the chat screen so that file stays about
 * the conversation. Visibility is derived from the screen's own scoped view, so
 * a chat sitting behind another one never shows its suggestions.
 */
export function useSuggestions(
  characterId: string,
  view: ChatView,
  inputRef: React.RefObject<TextInput | null>,
): SuggestionActions {
  const chat = useChatStore();
  const areSuggestionsHidden = chat.areSuggestionsHidden;

  const isTrayVisible = isSuggestionTrayVisible({ ...view, areSuggestionsHidden });

  const send = React.useCallback(
    (text: string) => {
      chat.sendUserMessage(text, characterId);
    },
    [chat.sendUserMessage, characterId],
  );

  const edit = React.useCallback(
    (text: string) => {
      chat.selectSuggestion(text);
      inputRef.current?.focus();
    },
    [chat.selectSuggestion, inputRef],
  );

  const reroll = React.useCallback(() => {
    chat.rerollSuggestions(characterId);
  }, [chat.rerollSuggestions, characterId]);

  const hide = React.useCallback(() => {
    chat.dismissSuggestions();
  }, [chat.dismissSuggestions]);

  const toggle = React.useCallback(() => {
    if (view.isTrayOpen) {
      chat.dismissSuggestions();
      return;
    }
    chat.revealSuggestions();
    if (view.suggestions.length === 0 && !view.isSuggestionsLoading) {
      chat.rerollSuggestions(characterId);
    }
  }, [
    view.isTrayOpen,
    view.suggestions.length,
    view.isSuggestionsLoading,
    chat.dismissSuggestions,
    chat.revealSuggestions,
    chat.rerollSuggestions,
    characterId,
  ]);

  return { isTrayVisible, send, edit, reroll, hide, toggle };
}
