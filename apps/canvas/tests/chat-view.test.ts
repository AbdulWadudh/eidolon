import { beforeEach, describe, expect, it } from "bun:test";
import { useChatStore } from "@/store/chat-store";
import { projectChat } from "@/store/chat-view";

function message(characterId: string, index: number) {
  return {
    id: `${characterId}-${index}`,
    characterId,
    role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
    text: `${characterId} line ${index}`,
    isNarration: false,
    audioUrl: null,
    audioDuration: null,
    imageUrl: null,
    timestamp: "00:00",
  };
}

function open(characterId: string, count: number) {
  useChatStore.setState({
    activeCharacterId: characterId,
    messages: Array.from({ length: count }, (_, index) => message(characterId, index)),
    mind: { affinity: count, affinityDelta: 0, tier: characterId, mood: "Warm", lastMemory: null },
    streamingText: `${characterId} is typing`,
    isStreaming: true,
    activeStatus: "thinking",
    inputText: `draft for ${characterId}`,
    suggestions: [`${characterId} reply`],
    isPainting: true,
    characterLook: {
      avatarUrl: `${characterId}.png`,
      avatarCrop: null,
      backgroundUrl: `${characterId}-bg.png`,
      faceUrl: null,
    },
  });
}

function viewOf(characterId: string) {
  return projectChat(useChatStore.getState(), characterId);
}

beforeEach(() => {
  useChatStore.getState().resetChat();
});

describe("a chat screen still mounted underneath another", () => {
  it("shows nothing once the store belongs to a different character", () => {
    open("nadia-kerr", 14);
    expect(viewOf("nadia-kerr").messages).toHaveLength(14);

    open("cass-delaney", 2);

    const stale = viewOf("nadia-kerr");
    expect(stale.isShowing).toBe(false);
    expect(stale.messages).toHaveLength(0);
  });

  it("does not borrow the other character's stream, draft, mind, avatar or backdrop", () => {
    open("nadia-kerr", 14);
    open("cass-delaney", 2);

    const stale = viewOf("nadia-kerr");
    expect(stale.streamingText).toBe("");
    expect(stale.isStreaming).toBe(false);
    expect(stale.inputText).toBe("");
    expect(stale.mind).toBeNull();
    expect(stale.suggestions).toHaveLength(0);
    expect(stale.characterLook.avatarUrl).toBeNull();
    expect(stale.characterLook.backgroundUrl).toBeNull();
    expect(stale.activeStatus).toBe("idle");
    expect(stale.isPainting).toBe(false);
  });

  it("gives the conversation back when that character is reopened", () => {
    open("nadia-kerr", 14);
    open("cass-delaney", 2);
    open("nadia-kerr", 14);

    const back = viewOf("nadia-kerr");
    expect(back.isShowing).toBe(true);
    expect(back.messages).toHaveLength(14);
  });
});

describe("the character the store is actually holding", () => {
  it("sees its own conversation", () => {
    open("cass-delaney", 2);

    const view = viewOf("cass-delaney");
    expect(view.isShowing).toBe(true);
    expect(view.messages.map((entry) => entry.text)).toEqual([
      "cass-delaney line 0",
      "cass-delaney line 1",
    ]);
  });

  it("drops a message stamped with somebody else's id", () => {
    open("cass-delaney", 2);
    useChatStore.setState((state) => ({
      messages: [...state.messages, message("nadia-kerr", 9)],
    }));

    expect(viewOf("cass-delaney").messages).toHaveLength(2);
  });

  it("reads as loading to a character the store has not opened yet", () => {
    expect(viewOf("emma").isLoadingHistory).toBe(true);
  });
});

describe("telling three kinds of nothing apart", () => {
  it("reads as loading before the store has claimed the character", () => {
    const view = viewOf("never-opened");
    expect(view.isLoadingHistory).toBe(true);
    expect(view.loadError).toBeNull();
  });

  it("carries a failure through to the screen that asked", () => {
    open("ines-vaz", 0);
    useChatStore.setState({ isLoadingHistory: false, lastError: "Network request failed" });

    const view = viewOf("ines-vaz");
    expect(view.isLoadingHistory).toBe(false);
    expect(view.loadError).toBe("Network request failed");
  });

  it("does not show one character's failure on another's screen", () => {
    open("ines-vaz", 0);
    useChatStore.setState({ isLoadingHistory: false, lastError: "Network request failed" });

    expect(viewOf("nadia-kerr").loadError).toBeNull();
  });

  it("reads as neither loading nor failed once a conversation is in hand", () => {
    open("ines-vaz", 12);
    useChatStore.setState({ isLoadingHistory: false, lastError: null });

    const view = viewOf("ines-vaz");
    expect(view.isLoadingHistory).toBe(false);
    expect(view.loadError).toBeNull();
    expect(view.messages).toHaveLength(12);
  });
});
