import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { ClientMessage, ServerMessage } from "@eidolon/protocol";
import "./support/mock-native";

const sent: ClientMessage[] = [];

mock.module("@/services/websocket", () => ({
  sendMessage: (payload: ClientMessage) => {
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

const { useCallStore } = await import("../store/call-store");

const CHARACTER = "emma";

function chunk(index: number, text: string, extra: Record<string, unknown> = {}): ServerMessage {
  return {
    type: "audio_chunk",
    format: "mp3",
    data: "QUJD",
    sentence_index: index,
    text,
    live: true,
    ...extra,
  } as ServerMessage;
}

function feed(...messages: ServerMessage[]): void {
  for (const message of messages) useCallStore.getState().handleServerMessage(message);
}

beforeEach(() => {
  sent.length = 0;
  useCallStore.getState().close();
  useCallStore.getState().open(CHARACTER);
});

afterAll(() => {
  useCallStore.getState().close();
});

describe("starting a new turn", () => {
  it("clears the last exchange so two turns never blur together", () => {
    feed(chunk(0, "The last thing she said."));
    useCallStore.getState().setHeard("the last thing you said");

    useCallStore.getState().beginTurn();
    const state = useCallStore.getState();

    expect(state.heard).toBe("");
    expect(state.subtitle).toBe("");
    expect(state.queue).toHaveLength(0);
  });

  it("files the new turn's audio under a fresh key", () => {
    const before = useCallStore.getState().turnKey;
    useCallStore.getState().beginTurn();
    expect(useCallStore.getState().turnKey).not.toBe(before);
  });

  it("keeps what you said on screen while she answers", () => {
    useCallStore.getState().setHeard("Oh really");
    feed(chunk(0, "Yeah, you know how it is."));

    const state = useCallStore.getState();
    expect(state.heard).toBe("Oh really");
    expect(state.subtitle).toBe("Yeah, you know how it is.");
  });
});

describe("her reply staying on screen", () => {
  it("survives the turn ending while the last sentences are still playing", () => {
    feed(chunk(0, "I am just tidying up."), chunk(1, "It feels nice."));
    useCallStore.getState().consume();
    useCallStore.getState().consume();

    feed({ type: "status_update", status: "idle" } as ServerMessage);

    expect(useCallStore.getState().subtitle).toBe("I am just tidying up. It feels nice.");
  });

  it("only clears the pair when a new turn is actually committed", () => {
    feed(chunk(0, "Her answer."));
    useCallStore.getState().setHeard("your question");

    expect(useCallStore.getState().subtitle).toBe("Her answer.");
    expect(useCallStore.getState().heard).toBe("your question");

    useCallStore.getState().beginTurn();
    expect(useCallStore.getState().subtitle).toBe("");
  });
});
