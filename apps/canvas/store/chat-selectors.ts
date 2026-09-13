import type { ChatStore } from "./chat-store";

export interface TrayState {
  areSuggestionsHidden: boolean;
  isTrayOpen: boolean;
  inputText: string;
  suggestions: string[];
  isSuggestionsLoading: boolean;
}

export function isSuggestionTrayVisible(state: TrayState): boolean {
  return !state.areSuggestionsHidden && state.isTrayOpen && state.inputText.length === 0;
}

export type { ChatStore };
