import { characterMessageUrl, TIMEOUTS_MS } from "@eidolon/config";
import { authedFetch } from "@/store/connection";
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
    const {
      characterId: mine,
      canReply,
      messages,
      mind,
      look,
    } = await fetchTranscript(host, characterId);

    // She turned out to belong to someone else, so this user has a copy of their own and
    // the conversation carries on there. Told here, before a word of it is on screen.
    if (mine !== characterId) {
      useChatStore.setState({ forkedTo: mine });
      return;
    }

    useChatStore.setState((state) => {
      if (state.activeCharacterId !== characterId) return {};

      return {
        messages: state.messages.length > messages.length ? state.messages : messages,
        mind: mind ?? state.mind,
        characterLook: look,
        canReply,
        isLoadingHistory: false,
        lastError: null,
      };
    });
  } catch (err) {
    useChatStore.setState((state) => {
      if (state.activeCharacterId !== characterId) return {};

      return {
        canReply: state.canReply ?? true,
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

export async function saveMessageEdit(
  host: string,
  characterId: string,
  messageId: string,
  content: string,
): Promise<boolean> {
  if (!host) return false;

  try {
    const res = await authedFetch(characterMessageUrl(host, characterId, messageId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    return res.ok;
  } catch {
    return false;
  }
}
