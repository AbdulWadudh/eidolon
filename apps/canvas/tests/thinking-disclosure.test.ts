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

const { useChatStore } = await import("../store/chat-store");

function feed(...messages: ServerMessage[]): void {
  for (const message of messages) {
    useChatStore.getState().handleServerMessage(message);
  }
}

const IDLE: ServerMessage = { type: "status_update", status: "idle", payload: { status: "idle" } };

function delta(token: string): ServerMessage {
  return {
    type: "text_delta",
    token,
    is_narration: false,
    payload: { token, is_narration: false },
  };
}

function committed(id: string, reasoning?: string): ServerMessage {
  return {
    type: "message_committed",
    payload: { message_id: id, ...(reasoning === undefined ? {} : { reasoning }) },
  };
}

beforeEach(() => {
  useChatStore.getState().resetChat();
});

describe("a reply carries what she thought before it", () => {
  it("lands the trace on the bubble the server committed", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(delta("Long day."), committed("msg-1", "she sounds worried"), IDLE);

    const last = useChatStore.getState().messages.at(-1);
    expect(last?.id).toBe("msg-1");
    expect(last?.text).toBe("Long day.");
    expect(last?.reasoning).toBe("she sounds worried");
  });

  it("leaves the bubble without one when the server sent none", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(delta("Fine."), committed("msg-2"), IDLE);

    expect(useChatStore.getState().messages.at(-1)?.reasoning).toBeNull();
  });

  it("does not carry one turn's thinking onto the next reply", () => {
    useChatStore.getState().sendUserMessage("first", "emma");
    feed(delta("One."), committed("msg-3", "the first thought"), IDLE);

    useChatStore.getState().sendUserMessage("second", "emma");
    feed(delta("Two."), committed("msg-4"), IDLE);

    const messages = useChatStore.getState().messages;
    expect(messages.at(-1)?.reasoning).toBeNull();
    expect(messages.find((message) => message.id === "msg-3")?.reasoning).toBe("the first thought");
  });

  it("clears the pending trace once the reply has settled", () => {
    useChatStore.getState().sendUserMessage("hi", "emma");
    feed(delta("Hey."), committed("msg-5", "keeping it light"), IDLE);

    expect(useChatStore.getState().pendingReasoning).toBeNull();
  });
});

function reasoningDelta(token: string): ServerMessage {
  return { type: "reasoning_delta", payload: { token } };
}

describe("thinking streams in while she is still writing", () => {
  it("accumulates the trace token by token", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(
      reasoningDelta("she sounds "),
      reasoningDelta("worried, "),
      reasoningDelta("play it down"),
    );

    expect(useChatStore.getState().streamingReasoning).toBe("she sounds worried, play it down");
  });

  it("keeps the streamed trace when the server commits no other one", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(reasoningDelta("weighing it up"), delta("Long day."), committed("msg-6"), IDLE);

    expect(useChatStore.getState().messages.at(-1)?.reasoning).toBe("weighing it up");
  });

  it("prefers the committed trace over the streamed one", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(
      reasoningDelta("partial"),
      delta("Long day."),
      committed("msg-7", "the whole thought"),
      IDLE,
    );

    expect(useChatStore.getState().messages.at(-1)?.reasoning).toBe("the whole thought");
  });

  it("clears the streamed trace before the next turn", () => {
    useChatStore.getState().sendUserMessage("first", "emma");
    feed(reasoningDelta("first thought"), delta("One."), committed("msg-8"), IDLE);

    useChatStore.getState().sendUserMessage("second", "emma");
    expect(useChatStore.getState().streamingReasoning).toBe("");
  });
});
