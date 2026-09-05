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
});
