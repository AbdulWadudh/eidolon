import type { ChatStore } from "./chat-store";

/**
 * Only the fields the tray actually depends on, so a screen can ask about its
 * own scoped view rather than about the whole shared store.
 */
export interface TrayState {
  areSuggestionsHidden: boolean;
  isTrayOpen: boolean;
  inputText: string;
  suggestions: string[];
  isSuggestionsLoading: boolean;
}

export function hasSuggestions(state: TrayState): boolean {
  return state.suggestions.length > 0 || state.isSuggestionsLoading;
}

export function isSuggestionTrayVisible(state: TrayState): boolean {
  return (
    !state.areSuggestionsHidden &&
    state.isTrayOpen &&
    state.inputText.length === 0 &&
    hasSuggestions(state)
  );
}

export type { ChatStore };
