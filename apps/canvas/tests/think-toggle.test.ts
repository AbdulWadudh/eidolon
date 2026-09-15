import { beforeEach, describe, expect, it, mock } from "bun:test";
import "./support/mock-native";

const sent: { type?: string; think?: boolean }[] = [];
mock.module("@/services/websocket", () => ({
  sendMessage: (payload: { type?: string; think?: boolean }) => {
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

function lastTurn(): { think?: boolean } | undefined {
  return sent.filter((message) => message.type === "chat_turn").at(-1);
}

beforeEach(() => {
  sent.length = 0;
  useChatStore.getState().resetChat();
  useChatStore.setState({ thinkNext: false });
});

describe("reasoning is a choice made one message at a time", () => {
  it("stays off unless it is asked for", () => {
    useChatStore.getState().sendUserMessage("morning", "emma");
    expect(lastTurn()?.think).toBe(false);
  });

  it("goes out with the next message once it is switched on", () => {
    useChatStore.getState().toggleThinkNext();
    expect(useChatStore.getState().thinkNext).toBe(true);

    useChatStore.getState().sendUserMessage("what do you actually think?", "emma");
    expect(lastTurn()?.think).toBe(true);
  });

  it("switches itself off again after the message is sent", () => {
    useChatStore.getState().toggleThinkNext();
    useChatStore.getState().sendUserMessage("first", "emma");
    expect(useChatStore.getState().thinkNext).toBe(false);

    useChatStore.getState().sendUserMessage("second", "emma");
    expect(lastTurn()?.think).toBe(false);
  });

  it("turns back off when pressed twice before sending", () => {
    useChatStore.getState().toggleThinkNext();
    useChatStore.getState().toggleThinkNext();
    useChatStore.getState().sendUserMessage("never mind", "emma");
    expect(lastTurn()?.think).toBe(false);
  });
});
