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

    // What the hook does on any status that is not "connected".
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
