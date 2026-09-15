import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ServerMessage } from "@eidolon/protocol";
import "./support/mock-native";

const sent: unknown[] = [];
mock.module("@/services/websocket", () => ({
  sendMessage: (message: unknown) => {
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

const { useChatStore, INITIAL_CHAT } = await import("../store/chat-store");

function feed(message: ServerMessage): void {
  useChatStore.getState().handleServerMessage(message);
}

describe("asking for a photo", () => {
  beforeEach(() => {
    sent.length = 0;
    useChatStore.setState({ ...INITIAL_CHAT, activeCharacterId: "emma" });
  });

  it("carries the chosen orientation and situation", () => {
    useChatStore.getState().requestImage("emma", "at the beach", "landscape");

    expect(sent.at(-1)).toEqual({
      type: "request_image",
      character_id: "emma",
      prompt_override: "at the beach",
      orientation: "landscape",
    });
  });

  it("leaves the situation off when nothing was typed", () => {
    useChatStore.getState().requestImage("emma", "   ", "portrait");

    expect(sent.at(-1)).toMatchObject({ prompt_override: undefined, orientation: "portrait" });
  });

  it("shows the loader from the tap until the photo lands", () => {
    useChatStore.getState().requestImage("emma", "", "portrait");
    expect(useChatStore.getState().isPainting).toBe(true);

    feed({ type: "image_preview", payload: { step: 3, total_steps: 6 } } as ServerMessage);
    expect(useChatStore.getState().paintingStep).toBe(3);
    expect(useChatStore.getState().paintingTotal).toBe(6);

    feed({
      type: "image_ready",
      payload: {
        image_url: "https://media.example/p.png",
        aspect_ratio: "9:16",
        prompt_used: "x",
        caption: "worth it",
      },
    } as unknown as ServerMessage);

    expect(useChatStore.getState().isPainting).toBe(false);
    expect(useChatStore.getState().messages.at(-1)?.text).toBe("worth it");
  });

  it("turns the loader off when generation fails", () => {
    useChatStore.getState().requestImage("emma", "", "portrait");
    feed({ type: "image_failed", payload: { reason: "No camera on this side" } } as ServerMessage);

    expect(useChatStore.getState().isPainting).toBe(false);
    expect(useChatStore.getState().lastError).toBe("No camera on this side");
  });

  it("collects photo ideas", () => {
    useChatStore.getState().requestPhotoIdeas("emma");
    expect(useChatStore.getState().areIdeasLoading).toBe(true);

    feed({ type: "photo_ideas", payload: { ideas: ["the view", "my dog"] } } as ServerMessage);
    expect(useChatStore.getState().photoIdeas).toEqual(["the view", "my dog"]);
    expect(useChatStore.getState().areIdeasLoading).toBe(false);
  });

  it("carries the photo being edited so it is a change, not a new picture", () => {
    useChatStore
      .getState()
      .requestImage("emma", "make the jacket red", "portrait", "https://media.example/p.png");

    expect(sent.at(-1)).toMatchObject({
      prompt_override: "make the jacket red",
      reference_url: "https://media.example/p.png",
    });
  });

  it("sends no reference for an ordinary request", () => {
    useChatStore.getState().requestImage("emma", "at the beach", "landscape");
    expect(sent.at(-1)).toMatchObject({ reference_url: undefined });
  });

  it("does not leave the card painting when the socket drops", () => {
    useChatStore.getState().requestImage("emma", "", "portrait");
    expect(useChatStore.getState().isPainting).toBe(true);

    useChatStore.setState({
      isPainting: false,
      paintingStep: 0,
      paintingTotal: 0,
      isStreaming: false,
      activeStatus: "idle",
      lastError: "Lost the connection before that finished.",
    });

    expect(useChatStore.getState().isPainting).toBe(false);
    expect(useChatStore.getState().activeStatus).toBe("idle");
  });
});

describe("a photo keeps the id the conductor filed it under", () => {
  beforeEach(() => {
    sent.length = 0;
    useChatStore.setState({ ...INITIAL_CHAT, activeCharacterId: "emma" });
  });

  function ready(messageId?: string): ServerMessage {
    return {
      type: "image_ready",
      image_url: "http://host/a.webp",
      aspect_ratio: "9:16",
      prompt_used: "fog",
      caption: "You'll stare at this too long.",
      ...(messageId ? { message_id: messageId } : {}),
      payload: {
        image_url: "http://host/a.webp",
        aspect_ratio: "9:16",
        prompt_used: "fog",
        caption: "You'll stare at this too long.",
        ...(messageId ? { message_id: messageId } : {}),
      },
    } as ServerMessage;
  }

  it("adopts the conductor's id so the reply can be read aloud", () => {
    feed(ready("msg-from-db"));
    expect(useChatStore.getState().messages.at(-1)?.id).toBe("msg-from-db");
  });

  it("asks to speak the row the conductor actually holds", () => {
    feed(ready("msg-from-db"));
    sent.length = 0;
    useChatStore.getState().refreshAudio("msg-from-db");

    expect(sent.at(-1)).toMatchObject({
      type: "resynthesize_audio",
      message_id: "msg-from-db",
    });
  });

  it("still shows the photo when an older conductor sends no id", () => {
    feed(ready());
    const last = useChatStore.getState().messages.at(-1);
    expect(last?.imageUrl).toBe("http://host/a.webp");
    expect(last?.id).toBeTruthy();
  });
});

describe("audio lands on the message it was made for", () => {
  beforeEach(() => {
    sent.length = 0;
    useChatStore.setState({ ...INITIAL_CHAT, activeCharacterId: "emma" });
  });

  function chunk(messageId?: string): ServerMessage {
    return {
      type: "audio_chunk",
      format: "mp3",
      data: "",
      url: `http://host/${messageId ?? "loose"}.mp3?v=1`,
      sentence_index: 0,
      payload: {
        format: "mp3",
        data: "",
        url: `http://host/${messageId ?? "loose"}.mp3?v=1`,
        sentence_index: 0,
        ...(messageId ? { message_id: messageId } : {}),
      },
    } as ServerMessage;
  }

  it("attaches to the named message, not the newest one", () => {
    useChatStore.setState({
      messages: [
        { ...blank(), id: "reply-1", role: "assistant", text: "the spoken one" },
        { ...blank(), id: "photo-2", role: "assistant", text: "a later photo" },
      ],
    });

    feed(chunk("reply-1"));

    const byId = Object.fromEntries(
      useChatStore.getState().messages.map((m) => [m.id, m.audioUrl]),
    );
    expect(byId["reply-1"]).toContain("reply-1.mp3");
    expect(byId["photo-2"]).toBeNull();
  });

  it("replaces audio that was already there", () => {
    useChatStore.setState({
      messages: [{ ...blank(), id: "reply-1", role: "assistant", audioUrl: "http://old.mp3" }],
    });

    feed(chunk("reply-1"));
    expect(useChatStore.getState().messages[0]?.audioUrl).toContain("v=1");
  });
});

function blank() {
  return {
    id: "x",
    characterId: "emma",
    role: "assistant" as const,
    text: "hi",
    isNarration: false,
    audioUrl: null,
    audioDuration: null,
    imageUrl: null,
    reasoning: null,
    timestamp: "00:00",
  };
}

describe("audio that arrives before its message exists", () => {
  beforeEach(() => {
    sent.length = 0;
    useChatStore.setState({ ...INITIAL_CHAT, activeCharacterId: "emma" });
  });

  function speak(messageId?: string): ServerMessage {
    return {
      type: "audio_chunk",
      format: "mp3",
      data: "",
      url: "http://host/spoken.mp3?v=9",
      sentence_index: 0,
      payload: {
        format: "mp3",
        data: "",
        url: "http://host/spoken.mp3?v=9",
        sentence_index: 0,
        ...(messageId ? { message_id: messageId } : {}),
      },
    } as ServerMessage;
  }

  const token = (text: string): ServerMessage =>
    ({
      type: "text_delta",
      token: text,
      is_narration: false,
      payload: { token: text, is_narration: false },
    }) as ServerMessage;

  const committed = (id: string): ServerMessage =>
    ({ type: "message_committed", payload: { message_id: id } }) as ServerMessage;

  const idle: ServerMessage = {
    type: "status_update",
    status: "idle",
    payload: { status: "idle" },
  } as ServerMessage;

  it("still reaches the reply when the conductor speaks before the turn commits", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(token("Long day."));
    feed(committed("m-9"));
    feed(speak("m-9"));
    feed(idle);

    const last = useChatStore.getState().messages.at(-1);
    expect(last?.id).toBe("m-9");
    expect(last?.audioUrl).toContain("spoken.mp3");
  });

  it("marks that reply for auto play", () => {
    useChatStore.getState().sendUserMessage("you ok?", "emma");
    feed(token("Long day."));
    feed(committed("m-9"));
    feed(speak("m-9"));
    feed(idle);

    const last = useChatStore.getState().messages.at(-1);
    expect(last?.audioUrl).toContain("spoken.mp3");
    expect(useChatStore.getState().autoPlayMessageId).toBe("m-9");
  });

  it("attaches straight away when the message is already on screen", () => {
    useChatStore.setState({
      messages: [{ ...blank(), id: "old-1", role: "assistant", text: "said before" }],
    });
    feed(speak("old-1"));

    expect(useChatStore.getState().messages[0]?.audioUrl).toContain("spoken.mp3");
    expect(useChatStore.getState().autoPlayMessageId).toBe("old-1");
  });
});
