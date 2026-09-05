import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ServerMessage } from "@eidolon/protocol";
import "./support/mock-native";

const sent: unknown[] = [];
mock.module("@/services/websocket", () => ({
  sendMessage: (payload: unknown) => {
    sent.push(payload);
    return true;
  },
  onServerMessage: () => () => undefined,
  onSocketStatus: () => () => undefined,
  onSocketRetry: () => () => undefined,
  configureSocket: () => undefined,
  openSocket: () => undefined,
  closeSocket: () => undefined,
  resetSocketBackoff: () => undefined,
  getSocketStatus: () => "connected",
}));

const { useChatStore } = await import("../store/chat-store");
const { isSuggestionTrayVisible } = await import("../store/chat-selectors");

function feed(...messages: ServerMessage[]): void {
  for (const message of messages) {
    useChatStore.getState().handleServerMessage(message);
  }
}

function delta(token: string, isNarration = false): ServerMessage {
  return { type: "text_delta", token, is_narration: isNarration };
}

const IDLE: ServerMessage = { type: "status_update", status: "idle" };

describe("chat-store streaming", () => {
  beforeEach(() => {
    sent.length = 0;
    useChatStore.getState().resetChat();
    useChatStore.getState().setActiveCharacter("emma");
  });

  it("accumulates text_delta tokens into streamingText while the turn is open", () => {
    feed(delta("She "), delta("tilts "), delta("her head."));

    const state = useChatStore.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.streamingText).toBe("She tilts her head.");
    expect(state.messages).toHaveLength(0);
  });

  it("commits the accumulated tokens into one message when the turn ends", () => {
    feed(delta("*She smiles.* "), delta("Hello "), delta("again."), IDLE);

    const state = useChatStore.getState();
    expect(state.isStreaming).toBe(false);
    expect(state.streamingText).toBe("");
    expect(state.messages).toHaveLength(1);

    const [message] = state.messages;
    expect(message.role).toBe("assistant");
    expect(message.characterId).toBe("emma");
    expect(message.text).toBe("*She smiles.* Hello again.");
    expect(message.timestamp).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it("treats a heartbeat pong as a no-op rather than the end of a turn", () => {
    feed(delta("Still "), { type: "status_update", status: "idle", detail: "pong" });

    const state = useChatStore.getState();
    expect(state.isStreaming).toBe(true);
    expect(state.streamingText).toBe("Still ");
    expect(state.messages).toHaveLength(0);
  });

  it("does not commit an empty turn", () => {
    feed(IDLE);
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("attaches an mp3 audio chunk to the last assistant message", () => {
    feed(delta("Listen."), IDLE);
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", sentence_index: 0 });

    const [message] = useChatStore.getState().messages;
    expect(message.audioUrl).toBe("data:audio/mpeg;base64,QUJD");
  });

  it("records reply suggestions and clears the loading flag", () => {
    useChatStore.setState({ isSuggestionsLoading: true });
    feed({ type: "reply_suggestions", suggestions: ["One.", "Two.", "Three."] });

    const state = useChatStore.getState();
    expect(state.suggestions).toEqual(["One.", "Two.", "Three."]);
    expect(state.isSuggestionsLoading).toBe(false);
  });

  it("stores the affinity state from mind_update", () => {
    feed({
      type: "mind_update",
      affinity_delta: 2,
      current_affinity: 76,
      affinity_tier: "Trusted Confidant",
      current_mood: "Playful",
    });

    expect(useChatStore.getState().mind).toEqual({
      affinity: 76,
      affinityDelta: 2,
      tier: "Trusted Confidant",
      mood: "Playful",
      lastMemory: null,
    });
  });
});

describe("chat-store actions", () => {
  beforeEach(() => {
    sent.length = 0;
    useChatStore.getState().setSuggestionsHidden(false);
    useChatStore.getState().resetChat();
  });

  it("selectSuggestion is the long-press path: it fills the dock instead of sending", () => {
    useChatStore.setState({
      suggestions: ["*She leans in.* Tell me more."],
      isTrayOpen: true,
    });
    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(true);

    useChatStore.getState().selectSuggestion("*She leans in.* Tell me more.");

    const state = useChatStore.getState();
    expect(state.inputText).toBe("*She leans in.* Tell me more.");
    expect(state.isTrayOpen).toBe(false);
    expect(isSuggestionTrayVisible(state)).toBe(false);
    expect(state.messages).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("tapping a suggestion sends it straight out without touching the draft", () => {
    useChatStore.setState({ suggestions: ["*folds my arms* You are enjoying this."] });
    useChatStore.getState().sendUserMessage("*folds my arms* You are enjoying this.", "emma");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].text).toBe("*folds my arms* You are enjoying this.");
    expect(state.inputText).toBe("");
    expect(sent.at(-1)).toMatchObject({
      type: "chat_turn",
      text: "*folds my arms* You are enjoying this.",
    });
  });

  it("keeps new reply options folded away until asked for", () => {
    feed({
      type: "reply_suggestions",
      suggestions: ["*nods* One.", "*waits* Two.", "*grins* Three."],
    });
    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(false);

    useChatStore.getState().revealSuggestions();
    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(true);
  });

  it("folds away again rather than losing the options", () => {
    feed({
      type: "reply_suggestions",
      suggestions: ["*nods* One.", "*waits* Two.", "*grins* Three."],
    });
    useChatStore.getState().revealSuggestions();
    useChatStore.getState().dismissSuggestions();

    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(false);
    expect(useChatStore.getState().suggestions).toHaveLength(3);
  });

  it("keeps the tray open through a reroll the reader asked for", () => {
    feed({ type: "reply_suggestions", suggestions: ["*a* One.", "*b* Two.", "*c* Three."] });
    useChatStore.getState().revealSuggestions();
    useChatStore.getState().rerollSuggestions("emma");

    feed({ type: "reply_suggestions", suggestions: ["*d* Four.", "*e* Five.", "*f* Six."] });

    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(true);
    expect(useChatStore.getState().suggestions[0]).toBe("*d* Four.");
  });

  it("will not open once reply options are turned off", () => {
    feed({ type: "reply_suggestions", suggestions: ["*a* One.", "*b* Two.", "*c* Three."] });
    useChatStore.getState().setSuggestionsHidden(true);
    useChatStore.setState({ isTrayOpen: true });

    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(false);
  });

  it("hides the tray while a draft is being typed", () => {
    feed({ type: "reply_suggestions", suggestions: ["*a* One.", "*b* Two.", "*c* Three."] });
    useChatStore.getState().revealSuggestions();
    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(true);

    useChatStore.getState().setInputText("half a thought");
    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(false);
  });

  it("does not generate options on its own after a turn", () => {
    useChatStore.getState().sendUserMessage("hi", "emma");
    feed(delta("hello."), IDLE);

    expect(useChatStore.getState().suggestions).toEqual([]);
    expect(isSuggestionTrayVisible(useChatStore.getState())).toBe(false);
  });

  it("survives a chat reset with the hide preference intact", () => {
    useChatStore.getState().setSuggestionsHidden(true);
    useChatStore.getState().resetChat();
    expect(useChatStore.getState().areSuggestionsHidden).toBe(true);
  });

  it("sendUserMessage appends the turn, clears the draft and emits chat_turn", () => {
    useChatStore.getState().setInputText("  Hi there  ");
    useChatStore.getState().sendUserMessage("  Hi there  ", "emma");

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({ role: "user", text: "Hi there" });
    expect(state.inputText).toBe("");
    expect(state.suggestions).toEqual([]);
    expect(state.isStreaming).toBe(true);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      type: "chat_turn",
      character_id: "emma",
      text: "Hi there",
      allow_search: true,
    });
  });

  it("ignores a blank draft", () => {
    useChatStore.getState().sendUserMessage("   ", "emma");
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("rerollSuggestions marks loading and emits regenerate_suggestions", () => {
    feed(delta("Hello."), IDLE);
    useChatStore.getState().setActiveCharacter("emma");
    const lastId = useChatStore.getState().messages[0].id;

    useChatStore.getState().rerollSuggestions("emma");

    expect(useChatStore.getState().isSuggestionsLoading).toBe(true);
    expect(sent.at(-1)).toMatchObject({
      type: "regenerate_suggestions",
      character_id: "emma",
      last_message_id: lastId,
    });
  });

  it("can ask for options in a chat with no messages yet", () => {
    useChatStore.getState().rerollSuggestions("emma");

    expect(useChatStore.getState().isSuggestionsLoading).toBe(true);
    expect(sent.at(-1)).toMatchObject({
      type: "regenerate_suggestions",
      character_id: "emma",
    });
  });
});
