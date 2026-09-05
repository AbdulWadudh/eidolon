import type { ChatStore } from "./chat-store";

export function hasSuggestions(state: ChatStore): boolean {
  return state.suggestions.length > 0 || state.isSuggestionsLoading;
}

export function isSuggestionTrayVisible(state: ChatStore): boolean {
  return (
    !state.areSuggestionsHidden &&
    state.isTrayOpen &&
    state.inputText.length === 0 &&
    hasSuggestions(state)
  );
}
