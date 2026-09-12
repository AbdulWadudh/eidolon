import type { ChatStore } from "./chat-store";

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
