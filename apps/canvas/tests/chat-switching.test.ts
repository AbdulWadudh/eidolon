import { beforeEach, describe, expect, it, mock } from "bun:test";

interface Transcript {
  messages: Array<{
    id: string;
    characterId: string;
    role: "user" | "assistant";
    text: string;
    isNarration: boolean;
    audioUrl: string | null;
    audioDuration: number | null;
    imageUrl: string | null;
    timestamp: string;
  }>;
  mind: { affinity: number; affinityDelta: number; tier: string; mood: string } | null;
  look: { avatarUrl: null; avatarCrop: null; backgroundUrl: null; faceUrl: null };
}

const transcripts = new Map<string, Transcript>();

mock.module("@/store/chat-api", () => ({
  fetchTranscript: async (_host: string, characterId: string) =>
    transcripts.get(characterId) ?? {
      messages: [],
      mind: null,
      look: { avatarUrl: null, avatarCrop: null, backgroundUrl: null, faceUrl: null },
    },
  forgetCharacter: async () => ({ mind: null }),
}));

mock.module("@/services/websocket", () => ({
  sendMessage: () => true,
  connectSocket: () => undefined,
  disconnectSocket: () => undefined,
}));

const { loadHistory } = await import("@/store/chat-history");
const { useChatStore } = await import("@/store/chat-store");

function transcript(characterId: string, count: number, mood: string): Transcript {
  return {
    messages: Array.from({ length: count }, (_, index) => ({
      id: `${characterId}-${index}`,
      characterId,
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      text: `${characterId} line ${index}`,
      isNarration: false,
      audioUrl: null,
      audioDuration: null,
      imageUrl: null,
      timestamp: "00:00",
    })),
    mind: { affinity: count, affinityDelta: 0, tier: characterId, mood },
    look: { avatarUrl: null, avatarCrop: null, backgroundUrl: null, faceUrl: null },
  };
}

beforeEach(() => {
  transcripts.clear();
  transcripts.set("chatty", transcript("chatty", 20, "Warm"));
  transcripts.set("fresh", transcript("fresh", 0, "Curious"));
  useChatStore.getState().resetChat();
});

describe("opening a different character", () => {
  it("does not leave the last character's conversation on screen", async () => {
    await loadHistory("host", "chatty");
    expect(useChatStore.getState().messages).toHaveLength(20);

    await loadHistory("host", "fresh");

    const state = useChatStore.getState();
    expect(state.activeCharacterId).toBe("fresh");
    expect(state.messages).toHaveLength(0);
  });

  it("replaces a long history with a shorter one", async () => {
    transcripts.set("fresh", transcript("fresh", 3, "Curious"));

    await loadHistory("host", "chatty");
    await loadHistory("host", "fresh");

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(3);
    expect(messages.every((message) => message.text.startsWith("fresh"))).toBe(true);
  });

  it("does not carry the last character's affinity across", async () => {
    await loadHistory("host", "chatty");
    expect(useChatStore.getState().mind?.tier).toBe("chatty");

    await loadHistory("host", "fresh");
    expect(useChatStore.getState().mind?.tier).toBe("fresh");
  });

  it("clears a half typed message when the character changes", async () => {
    await loadHistory("host", "chatty");
    useChatStore.getState().setInputText("half a thought");

    await loadHistory("host", "fresh");
    expect(useChatStore.getState().inputText).toBe("");
  });
});

describe("reopening the same character", () => {
  it("keeps a turn that landed while the fetch was in flight", async () => {
    await loadHistory("host", "chatty");

    // A reply arrives before the second fetch resolves.
    useChatStore.setState((state) => ({
      messages: [
        ...state.messages,
        {
          id: "live",
          characterId: "chatty",
          role: "assistant" as const,
          text: "just now",
          isNarration: false,
          audioUrl: null,
          audioDuration: null,
          imageUrl: null,
          timestamp: "00:00",
        },
      ] as typeof state.messages,
    }));

    await loadHistory("host", "chatty");

    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(21);
    expect(messages.at(-1)?.text).toBe("just now");
  });

  it("keeps what was typed", async () => {
    await loadHistory("host", "chatty");
    useChatStore.getState().setInputText("still writing");

    await loadHistory("host", "chatty");
    expect(useChatStore.getState().inputText).toBe("still writing");
  });
});

describe("arriving from a character with a longer history", () => {
  it("shows the new character's messages, not nothing", async () => {
    // The reported failure exactly: Char-123 has 37 messages, Ines has 12, and
    // opening Ines showed an empty stage on a week-old conversation.
    transcripts.set("char-123", transcript("char-123", 37, "Warm"));
    transcripts.set("ines-vaz", transcript("ines-vaz", 12, "Vulnerable"));

    await loadHistory("host", "char-123");
    expect(useChatStore.getState().messages).toHaveLength(37);

    // The socket hook claims the store on mount, before the fetch is asked for.
    useChatStore.getState().setActiveCharacter("ines-vaz");
    await loadHistory("host", "ines-vaz");

    const state = useChatStore.getState();
    expect(state.activeCharacterId).toBe("ines-vaz");
    expect(state.messages).toHaveLength(12);
    expect(state.messages.every((message) => message.characterId === "ines-vaz")).toBe(true);
  });

  it("leaves nothing of the last character behind when the id is claimed", () => {
    useChatStore.setState({
      activeCharacterId: "char-123",
      messages: transcript("char-123", 37, "Warm").messages,
    });

    useChatStore.getState().setActiveCharacter("ines-vaz");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(0);
    expect(state.isLoadingHistory).toBe(true);
  });

  it("does not throw away a conversation when the same id is claimed twice", () => {
    useChatStore.setState({
      activeCharacterId: "ines-vaz",
      messages: transcript("ines-vaz", 12, "Vulnerable").messages,
    });

    useChatStore.getState().setActiveCharacter("ines-vaz");

    expect(useChatStore.getState().messages).toHaveLength(12);
  });
});
