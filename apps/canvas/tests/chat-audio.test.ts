import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ServerMessage } from "@eidolon/protocol";
import "./support/mock-native";

mock.module("@/services/websocket", () => ({
  sendMessage: () => true,
  onServerMessage: () => () => undefined,
  onSocketStatus: () => () => undefined,
  onSocketRetry: () => () => undefined,
  configureSocket: () => undefined,
  openSocket: () => undefined,
  closeSocket: () => undefined,
  resetSocketBackoff: () => undefined,
  getSocketStatus: () => "connected",
}));

const { commitStreamingTurn, useChatStore } = await import("../store/chat-store");
const { useCallStore } = await import("../store/call-store");
const { visibleText } = await import("../store/chat-messages");

function feed(...messages: ServerMessage[]): void {
  for (const message of messages) {
    useChatStore.getState().handleServerMessage(message);
  }
}

function delta(token: string, isNarration = false): ServerMessage {
  return { type: "text_delta", token, is_narration: isNarration };
}

const IDLE: ServerMessage = { type: "status_update", status: "idle" };

describe("voice note playback", () => {
  beforeEach(() => {
    useCallStore.getState().close();
    useChatStore.getState().resetChat();
    useChatStore.getState().setActiveCharacter("emma");
  });

  it("marks a reply that arrived with audio for autoplay", () => {
    feed(delta("Listen."));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", sentence_index: 0 });
    feed(IDLE);

    const state = useChatStore.getState();
    expect(state.messages.at(-1)?.audioUrl).toBe("data:audio/mpeg;base64,QUJD");
    expect(state.autoPlayMessageId).toBe(state.messages.at(-1)?.id ?? null);
  });

  it("ignores the sentences a live call speaks, so the note is the whole reply", () => {
    feed(delta("Oh nothing much. Just trying to keep my head above water."));
    feed(
      { type: "audio_chunk", format: "mp3", data: "Rklstsentence0", sentence_index: 0, live: true },
      { type: "audio_chunk", format: "mp3", data: "Rklstsentence1", sentence_index: 1, live: true },
    );

    expect(useChatStore.getState().pendingAudio).toBeNull();

    feed(
      { type: "audio_chunk", format: "mp3", data: "QUJD", duration: 7.63, sentence_index: 0 },
      IDLE,
    );

    const note = useChatStore.getState().messages.at(-1);
    expect(note?.audioUrl).toBe("data:audio/mpeg;base64,QUJD");
    expect(note?.audioDuration).toBe(7.63);
  });

  it("never leaves a voice note without the length the conductor measured", () => {
    feed(delta("Listen."));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", duration: 4.03, sentence_index: 0 });
    feed(IDLE);

    expect(useChatStore.getState().messages.at(-1)?.audioDuration).toBe(4.03);
  });

  it("writes what the conductor heard into the feed as your turn", () => {
    feed({ type: "transcript", text: "  Oh really  ", is_final: true });

    const said = useChatStore.getState().messages.at(-1);
    expect(said?.role).toBe("user");
    expect(said?.text).toBe("Oh really");
  });

  it("ignores a partial or empty transcript", () => {
    feed(
      { type: "transcript", text: "Oh re", is_final: false },
      { type: "transcript", text: "   ", is_final: true },
    );
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  it("does not autoplay in the feed while a call is speaking the same reply", () => {
    useCallStore.getState().open("emma");

    feed(delta("Oh nothing much."));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", duration: 7.63, sentence_index: 0 });
    feed(IDLE);

    const state = useChatStore.getState();
    expect(state.messages.at(-1)?.audioUrl).toBe("data:audio/mpeg;base64,QUJD");
    expect(state.autoPlayMessageId).toBeNull();

    useCallStore.getState().close();
  });

  it("autoplays again once the call has ended", () => {
    useCallStore.getState().open("emma");
    useCallStore.getState().close();

    feed(delta("Back to typing."));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", duration: 2.1, sentence_index: 0 });
    feed(IDLE);

    const state = useChatStore.getState();
    expect(state.autoPlayMessageId).toBe(state.messages.at(-1)?.id ?? null);
  });

  it("leaves a silent reply alone", () => {
    feed(delta("No audio here."), IDLE);
    expect(useChatStore.getState().autoPlayMessageId).toBeNull();
  });

  it("holds audio that arrives before the reply is committed", () => {
    feed(delta("Half a "));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", sentence_index: 0 });

    expect(useChatStore.getState().pendingAudio).not.toBeNull();
    expect(useChatStore.getState().messages).toHaveLength(0);

    feed(delta("reply."), IDLE);
    expect(useChatStore.getState().messages.at(-1)?.audioUrl).toBe("data:audio/mpeg;base64,QUJD");
    expect(useChatStore.getState().pendingAudio).toBeNull();
  });

  it("does not replay when the same turn is committed twice", () => {
    feed(delta("Listen."));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", sentence_index: 0 });
    feed(IDLE);
    const first = useChatStore.getState().autoPlayMessageId;

    commitStreamingTurn();
    expect(useChatStore.getState().autoPlayMessageId).toBe(first);
    expect(useChatStore.getState().messages).toHaveLength(1);
  });

  it("prefers a hosted url over an inline base64 payload", () => {
    feed(delta("Hosted."));
    feed({
      type: "audio_chunk",
      format: "mp3",
      data: "",
      url: "https://media.example/voice/1.mp3",
      sentence_index: 0,
    });
    feed(IDLE);

    expect(useChatStore.getState().messages.at(-1)?.audioUrl).toBe(
      "https://media.example/voice/1.mp3",
    );
  });

  it("clears the autoplay token once it has been consumed", () => {
    feed(delta("Speak."));
    feed({ type: "audio_chunk", format: "mp3", data: "QUJD", sentence_index: 0 });
    feed(IDLE);
    const played = useChatStore.getState().autoPlayMessageId;
    expect(played).not.toBeNull();

    useChatStore.getState().clearAutoPlay();

    expect(useChatStore.getState().autoPlayMessageId).toBeNull();
    expect(useChatStore.getState().messages.at(-1)?.audioUrl).toBe("data:audio/mpeg;base64,QUJD");
  });

  it("adds a photo message when the character sends one", () => {
    feed({
      type: "image_ready",
      payload: {
        image_url: "https://media.example/photo.png",
        aspect_ratio: "9:16",
        prompt_used: "a bookshop",
      },
    } as unknown as ServerMessage);

    const last = useChatStore.getState().messages.at(-1);
    expect(last?.imageUrl).toBe("https://media.example/photo.png");
    expect(last?.role).toBe("assistant");
    expect(useChatStore.getState().isPainting).toBe(false);
  });

  it("never renders the photo marker as chat text", () => {
    expect(visibleText({ text: "*sends a photo*", imageUrl: "https://x/p.png" })).toBe("");
    expect(visibleText({ text: "*sends a photo of her dog*", imageUrl: "https://x/p.png" })).toBe(
      "",
    );
  });

  it("keeps a real caption", () => {
    expect(visibleText({ text: "Look at this view", imageUrl: "https://x/p.png" })).toBe(
      "Look at this view",
    );
    expect(visibleText({ text: "*sends a photo*", imageUrl: null })).toBe("*sends a photo*");
  });
});
