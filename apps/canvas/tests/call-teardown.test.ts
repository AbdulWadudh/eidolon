import { beforeEach, describe, expect, it, mock } from "bun:test";
import "./support/mock-native";

const sent: Record<string, unknown>[] = [];

mock.module("@/services/websocket", () => ({
  sendMessage: (message: Record<string, unknown>) => {
    sent.push(message);
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
const { isCallLive, useCallStore } = await import("../store/call-store");

const CHARACTER = "emma";

function lastTurn(): Record<string, unknown> | undefined {
  return sent.filter((message) => message.type === "chat_turn").at(-1);
}

describe("leaving a call releases the live voice channel", () => {
  beforeEach(() => {
    sent.length = 0;
    useCallStore.getState().close();
    useChatStore.getState().resetChat();
    useChatStore.getState().setActiveCharacter(CHARACTER);
  });

  it("streams sentences instead of a voice note while the call is open", () => {
    useCallStore.getState().open(CHARACTER);
    useChatStore.getState().sendUserMessage("hello", CHARACTER);

    expect(lastTurn()?.live_voice).toBe(true);
  });

  it("asks for a voice note again once the call is closed", () => {
    useCallStore.getState().open(CHARACTER);
    useCallStore.getState().close();
    useChatStore.getState().sendUserMessage("hello", CHARACTER);

    expect(isCallLive(CHARACTER)).toBe(false);
    expect(lastTurn()?.live_voice).toBe(false);
  });

  it("asks for a voice note when no call was ever placed", () => {
    useChatStore.getState().sendUserMessage("hello", CHARACTER);

    expect(lastTurn()?.live_voice).toBe(false);
  });

  it("does not leave another character's chat speechless", () => {
    useCallStore.getState().open("nadia-kerr");
    useChatStore.getState().sendUserMessage("hello", CHARACTER);

    expect(lastTurn()?.live_voice).toBe(false);
  });
});
