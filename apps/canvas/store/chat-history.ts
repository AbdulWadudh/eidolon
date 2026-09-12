import { fetchTranscript, forgetCharacter as requestForget } from "./chat-api";
import { INITIAL_CHAT, useChatStore } from "./chat-store";

export async function loadHistory(host: string, characterId: string): Promise<void> {
  if (!host) return;

  useChatStore.setState((state) => {
    if (state.activeCharacterId === characterId) {
      return { isLoadingHistory: true, lastError: null };
    }

    return {
      ...INITIAL_CHAT,
      areSuggestionsHidden: state.areSuggestionsHidden,
      activeCharacterId: characterId,
      isLoadingHistory: true,
      lastError: null,
    };
  });

  try {
    const { messages, mind, look } = await fetchTranscript(host, characterId);

    useChatStore.setState((state) => {
      if (state.activeCharacterId !== characterId) return {};

      return {
        messages: state.messages.length > messages.length ? state.messages : messages,
        mind: mind ?? state.mind,
        characterLook: look,
        isLoadingHistory: false,
        lastError: null,
      };
    });
  } catch (err) {
    useChatStore.setState((state) => {
      if (state.activeCharacterId !== characterId) return {};

      return {
        isLoadingHistory: false,
        lastError: err instanceof Error ? err.message : "Could not load the conversation.",
      };
    });
  }
}

export async function forgetCharacter(host: string, characterId: string): Promise<void> {
  useChatStore.setState({ isLoadingHistory: true, lastError: null });

  try {
    const { mind } = await requestForget(host, characterId);
    useChatStore.setState((state) => ({
      ...INITIAL_CHAT,
      areSuggestionsHidden: state.areSuggestionsHidden,
      activeCharacterId: characterId,
      mind,
      isLoadingHistory: false,
    }));
  } catch (err) {
    useChatStore.setState({
      isLoadingHistory: false,
      lastError: err instanceof Error ? err.message : "Could not reset the conversation.",
    });
  }
}
