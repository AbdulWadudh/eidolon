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

const { appendSpoken, callElapsedSeconds, isCallLive, liveChunk, useCallStore } = await import(
  "../store/call-store"
);

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

describe("opening and ending a call", () => {
  it("starts listening with a clock running", () => {
    const state = useCallStore.getState();
    expect(state.characterId).toBe(CHARACTER);
    expect(state.phase).toBe("listening");
    expect(state.startedAt).not.toBeNull();
  });

  it("reads the call as live so the turn asks for spoken audio", () => {
    expect(isCallLive(CHARACTER)).toBe(true);
    expect(isCallLive("somebody-else")).toBe(false);
  });

  it("is no longer live once the call ends", () => {
    useCallStore.getState().close();
    expect(isCallLive(CHARACTER)).toBe(false);
    expect(useCallStore.getState().phase).toBe("ended");
  });

  it("ignores anything that arrives before a call is open", () => {
    useCallStore.getState().close();
    feed(chunk(0, "Hello."));
    expect(useCallStore.getState().queue).toHaveLength(0);
  });
});

describe("spoken sentences arriving", () => {
  it("queues a live chunk and shows its sentence as the subtitle", () => {
    feed(chunk(0, "You came back."));
    const state = useCallStore.getState();

    expect(state.phase).toBe("speaking");
    expect(state.subtitle).toBe("You came back.");
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]?.index).toBe(0);
  });

  it("keeps sentences in the order they were spoken", () => {
    feed(chunk(0, "One."), chunk(1, "Two."), chunk(2, "Three."));
    expect(useCallStore.getState().queue.map((entry) => entry.index)).toEqual([0, 1, 2]);
  });

  it("builds the whole reply on screen rather than only the sentence being spoken", () => {
    feed(
      chunk(0, "I'm just tidying up the living room a bit."),
      chunk(1, "Fluffing the cushions, straightening the bookshelf."),
      chunk(2, "It feels nice to have a quiet moment like this."),
    );

    expect(useCallStore.getState().subtitle).toBe(
      "I'm just tidying up the living room a bit. Fluffing the cushions, straightening the bookshelf. It feels nice to have a quiet moment like this.",
    );
  });

  it("joins spoken sentences with a single space and ignores empty ones", () => {
    expect(appendSpoken("", "One.")).toBe("One.");
    expect(appendSpoken("One.", "Two.")).toBe("One. Two.");
    expect(appendSpoken("One.", "   ")).toBe("One.");
    expect(appendSpoken("One.", "  Two.  ")).toBe("One. Two.");
  });

  it("ignores the archived voice note the chat feed gets", () => {
    feed({
      type: "audio_chunk",
      format: "mp3",
      data: "QUJD",
      sentence_index: 0,
    } as ServerMessage);

    expect(useCallStore.getState().queue).toHaveLength(0);
    expect(useCallStore.getState().phase).toBe("listening");
  });

  it("keeps what is already on screen when a chunk carries no text", () => {
    feed(chunk(0, "Stay."), chunk(1, ""));
    expect(useCallStore.getState().subtitle).toBe("Stay.");
  });

  it("drops a chunk carrying neither audio nor a url", () => {
    expect(
      liveChunk(
        { type: "audio_chunk", format: "mp3", data: "", sentence_index: 0, live: true },
        "0",
      ),
    ).toBeNull();
  });

  it("prefers a url over inline audio when the server sent one", () => {
    const parsed = liveChunk(
      {
        type: "audio_chunk",
        format: "mp3",
        data: "QUJD",
        url: "https://storage.example/sentence.mp3",
        sentence_index: 3,
        live: true,
      },
      "0",
    );

    expect(parsed?.url).toBe("https://storage.example/sentence.mp3");
    expect(parsed?.key).toBe("0-3");
  });
});

describe("playing through the queue", () => {
  it("hands sentences out one at a time", () => {
    feed(chunk(0, "One."), chunk(1, "Two."));
    const store = useCallStore.getState();

    expect(store.consume()?.index).toBe(0);
    expect(store.consume()?.index).toBe(1);
    expect(store.consume()).toBeNull();
    expect(useCallStore.getState().playedIndex).toBe(1);
  });

  it("goes back to listening once the queue has run dry", () => {
    feed(chunk(0, "Only one."));
    useCallStore.getState().consume();
    useCallStore.getState().finishedSpeaking();
    expect(useCallStore.getState().phase).toBe("listening");
  });

  it("keeps speaking while there is still something queued", () => {
    feed(chunk(0, "One."), chunk(1, "Two."));
    useCallStore.getState().consume();
    useCallStore.getState().finishedSpeaking();
    expect(useCallStore.getState().phase).toBe("speaking");
  });
});

describe("interrupting", () => {
  it("tells the conductor to stop and empties what was queued", () => {
    feed(chunk(0, "I was going to say"), chunk(1, "something long."));
    useCallStore.getState().interrupt();
    const state = useCallStore.getState();

    expect(sent).toEqual([{ type: "interrupt", character_id: CHARACTER }]);
    expect(state.queue).toHaveLength(0);
    expect(state.subtitle).toBe("");
    expect(state.phase).toBe("listening");
  });

  it("files the next turn's audio under a fresh key", () => {
    const before = useCallStore.getState().turnKey;
    useCallStore.getState().interrupt();
    expect(useCallStore.getState().turnKey).not.toBe(before);
  });

  it("stays quiet when no call is open", () => {
    useCallStore.getState().close();
    useCallStore.getState().interrupt();
    expect(sent).toHaveLength(0);
  });
});

describe("status and failure", () => {
  it("shows her thinking while the model works", () => {
    feed({ type: "status_update", status: "thinking" } as ServerMessage);
    expect(useCallStore.getState().phase).toBe("thinking");
  });

  it("returns to listening when the turn ends with nothing left to play", () => {
    feed(
      { type: "status_update", status: "thinking" } as ServerMessage,
      { type: "status_update", status: "idle" } as ServerMessage,
    );
    expect(useCallStore.getState().phase).toBe("listening");
  });

  it("drops the queue when the conductor reports a failure", () => {
    feed(chunk(0, "One."), {
      type: "error",
      code: "LLM_OFFLINE",
      message: "No model.",
    } as ServerMessage);

    expect(useCallStore.getState().queue).toHaveLength(0);
    expect(useCallStore.getState().phase).toBe("listening");
  });
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

describe("the call controls", () => {
  it("toggles the microphone and the speaker independently", () => {
    useCallStore.getState().toggleMute();
    expect(useCallStore.getState().isMuted).toBe(true);
    expect(useCallStore.getState().isSpeakerOn).toBe(true);

    useCallStore.getState().toggleSpeaker();
    expect(useCallStore.getState().isSpeakerOn).toBe(false);

    useCallStore.getState().toggleMute();
    expect(useCallStore.getState().isMuted).toBe(false);
  });
});

describe("the call clock", () => {
  it("counts whole seconds from the moment the call opened", () => {
    expect(callElapsedSeconds(1000, 1000)).toBe(0);
    expect(callElapsedSeconds(1000, 135_000)).toBe(134);
  });

  it("never runs backwards or before a call started", () => {
    expect(callElapsedSeconds(null, 5000)).toBe(0);
    expect(callElapsedSeconds(9000, 1000)).toBe(0);
  });
});
