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
  useChatStore.setState({ isLoadingHistory: true, lastError: null });

  try {
    const { messages, mind, look } = await fetchTranscript(host, characterId);
    useChatStore.setState((state) => {
      // Opening a different character replaces everything. Keeping the longer
      // list is only ever right for the character already on screen: switching
      // from someone with a long history to someone with none used to leave the
      // first one's conversation sitting under the second one's name.
      const sameCharacter = state.activeCharacterId === characterId;

      return {
        activeCharacterId: characterId,
        // A turn that landed while this was in flight wins; the socket is more
        // current than the page of history we asked for.
        messages:
          sameCharacter && state.messages.length > messages.length ? state.messages : messages,
        mind: sameCharacter ? (mind ?? state.mind) : mind,
        streamingText: sameCharacter ? state.streamingText : "",
        isStreaming: sameCharacter ? state.isStreaming : false,
        suggestions: sameCharacter ? state.suggestions : [],
        enhanceHistory: sameCharacter ? state.enhanceHistory : [],
        inputText: sameCharacter ? state.inputText : "",
        characterLook: look,
        isLoadingHistory: false,
      };
    });
  } catch (err) {
    useChatStore.setState({
      isLoadingHistory: false,
      lastError: err instanceof Error ? err.message : "Could not load the conversation.",
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
