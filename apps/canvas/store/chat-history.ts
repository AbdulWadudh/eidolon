import { fetchTranscript, forgetCharacter as requestForget } from "./chat-api";
import { INITIAL_CHAT, useChatStore } from "./chat-store";

/**
 * The transcript lives on the conductor, so reopening a chat has to fetch it.
 * Kept apart from the store itself, which only ever reacts to the socket.
 *
 * This deliberately leaves `autoPlayMessageId` alone. Reopening is silent
 * because restored messages carry no audio, not because the flag is cleared —
 * clearing it here raced a reply that landed while the fetch was in flight and
 * killed its playback.
 */
export async function loadHistory(host: string, characterId: string): Promise<void> {
  if (!host) return;

  // The store is bound to this character before the fetch, not after it. Doing
  // it after meant a screen had no claim on the store while its own history was
  // loading, so a failed fetch left it showing a placeholder for a character it
  // never admitted to being — and no error, because nothing ever cleared it.
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
      // Two fetches can be in flight when a reader moves quickly, and the
      // slower one must not overwrite the character now on screen.
      if (state.activeCharacterId !== characterId) return {};

      return {
        // A turn that landed while this was in flight wins; the socket is more
        // current than the page of history we asked for.
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
