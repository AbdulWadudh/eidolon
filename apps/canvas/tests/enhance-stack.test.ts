import { beforeEach, describe, expect, it, mock } from "bun:test";

const sent: Array<Record<string, unknown>> = [];

mock.module("@/services/websocket", () => ({
  sendMessage: (message: Record<string, unknown>) => {
    sent.push(message);
    return true;
  },
  connectSocket: () => undefined,
  disconnectSocket: () => undefined,
}));

const { useChatStore } = await import("@/store/chat-store");

const CHARACTER_ID = "enhance-stack";

function enhanced(text: string): void {
  useChatStore.getState().handleServerMessage({
    type: "message_enhanced",
    text,
    original: "",
    payload: { text, original: "" },
  });
}

function enhanceFailed(): void {
  useChatStore.getState().handleServerMessage({
    type: "error",
    code: "ENHANCE_FAILED",
    message: "no",
    payload: { code: "ENHANCE_FAILED", message: "no" },
  });
}

beforeEach(() => {
  sent.length = 0;
  useChatStore.getState().resetChat();
});

describe("asking for a rework", () => {
  it("sends the draft and marks itself busy", () => {
    useChatStore.getState().setInputText("hey are you free");
    useChatStore.getState().enhanceInput(CHARACTER_ID);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      type: "enhance_message",
      character_id: CHARACTER_ID,
      text: "hey are you free",
    });
    expect(useChatStore.getState().isEnhancing).toBe(true);
  });

  it("banks the draft so revert has somewhere to go", () => {
    useChatStore.getState().setInputText("hey are you free");
    useChatStore.getState().enhanceInput(CHARACTER_ID);

    expect(useChatStore.getState().enhanceHistory).toEqual(["hey are you free"]);
  });

  it("ignores an empty draft", () => {
    useChatStore.getState().setInputText("   ");
    useChatStore.getState().enhanceInput(CHARACTER_ID);

    expect(sent).toHaveLength(0);
    expect(useChatStore.getState().isEnhancing).toBe(false);
  });

  it("refuses a second request while one is in flight", () => {
    useChatStore.getState().setInputText("hey");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    useChatStore.getState().enhanceInput(CHARACTER_ID);

    expect(sent).toHaveLength(1);
    expect(useChatStore.getState().enhanceHistory).toHaveLength(1);
  });

  it("swaps the rewrite into the input when it arrives", () => {
    useChatStore.getState().setInputText("hey are you free");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("Hey — any chance you are free later?");

    expect(useChatStore.getState().inputText).toBe("Hey — any chance you are free later?");
    expect(useChatStore.getState().isEnhancing).toBe(false);
  });
});

describe("reworking again and again", () => {
  it("stacks every version without a limit", () => {
    useChatStore.getState().setInputText("v0");

    for (let round = 1; round <= 5; round += 1) {
      useChatStore.getState().enhanceInput(CHARACTER_ID);
      enhanced(`v${round}`);
    }

    expect(useChatStore.getState().inputText).toBe("v5");
    expect(useChatStore.getState().enhanceHistory).toEqual(["v0", "v1", "v2", "v3", "v4"]);
  });

  it("walks back one version per revert, ending at the original", () => {
    useChatStore.getState().setInputText("v0");
    for (let round = 1; round <= 3; round += 1) {
      useChatStore.getState().enhanceInput(CHARACTER_ID);
      enhanced(`v${round}`);
    }

    useChatStore.getState().revertEnhance();
    expect(useChatStore.getState().inputText).toBe("v2");

    useChatStore.getState().revertEnhance();
    expect(useChatStore.getState().inputText).toBe("v1");

    useChatStore.getState().revertEnhance();
    expect(useChatStore.getState().inputText).toBe("v0");
    expect(useChatStore.getState().enhanceHistory).toEqual([]);
  });

  it("does nothing once the original is back", () => {
    useChatStore.getState().setInputText("v0");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("v1");

    useChatStore.getState().revertEnhance();
    useChatStore.getState().revertEnhance();
    useChatStore.getState().revertEnhance();

    expect(useChatStore.getState().inputText).toBe("v0");
  });

  it("lets a reverted draft be reworked again", () => {
    useChatStore.getState().setInputText("v0");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("v1");
    useChatStore.getState().revertEnhance();

    useChatStore.getState().enhanceInput(CHARACTER_ID);
    expect(sent.at(-1)).toMatchObject({ text: "v0" });
    enhanced("v1-take-two");

    expect(useChatStore.getState().inputText).toBe("v1-take-two");
    expect(useChatStore.getState().enhanceHistory).toEqual(["v0"]);
  });

  it("keeps a hand edit as the version revert returns to", () => {
    useChatStore.getState().setInputText("v0");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("v1");

    useChatStore.getState().setInputText("v1 with my own tweak");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("v2");

    useChatStore.getState().revertEnhance();
    expect(useChatStore.getState().inputText).toBe("v1 with my own tweak");
  });
});

describe("when the rework fails", () => {
  it("leaves the draft untouched and takes the step back off the stack", () => {
    useChatStore.getState().setInputText("hey are you free");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanceFailed();

    const state = useChatStore.getState();
    expect(state.inputText).toBe("hey are you free");
    expect(state.enhanceHistory).toEqual([]);
    expect(state.isEnhancing).toBe(false);
  });

  it("does not knock the stream or the tray over", () => {
    useChatStore.getState().setInputText("hey");
    useChatStore.setState({ isStreaming: true, isSuggestionsLoading: true });
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanceFailed();

    expect(useChatStore.getState().isStreaming).toBe(true);
    expect(useChatStore.getState().isSuggestionsLoading).toBe(true);
  });

  it("still stops the stream for an unrelated error", () => {
    useChatStore.setState({ isStreaming: true });
    useChatStore.getState().handleServerMessage({
      type: "error",
      code: "INVALID_MESSAGE",
      message: "nope",
      payload: { code: "INVALID_MESSAGE", message: "nope" },
    });

    expect(useChatStore.getState().isStreaming).toBe(false);
  });
});

describe("leaving the draft behind", () => {
  it("clears the stack once the message is sent", () => {
    useChatStore.getState().setInputText("v0");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("v1");

    useChatStore.getState().sendUserMessage("v1", CHARACTER_ID);

    expect(useChatStore.getState().inputText).toBe("");
    expect(useChatStore.getState().enhanceHistory).toEqual([]);
  });

  it("clears the stack when a suggestion replaces the draft", () => {
    useChatStore.getState().setInputText("v0");
    useChatStore.getState().enhanceInput(CHARACTER_ID);
    enhanced("v1");

    useChatStore.getState().selectSuggestion("a different line entirely");

    expect(useChatStore.getState().inputText).toBe("a different line entirely");
    expect(useChatStore.getState().enhanceHistory).toEqual([]);
  });
});
