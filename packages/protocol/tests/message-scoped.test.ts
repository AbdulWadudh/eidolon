import { describe, expect, it } from "bun:test";
import { ServerMessageSchema } from "../src/events/server";

const MESSAGE_SCOPED = [
  "audio_chunk",
  "image_ready",
  "message_committed",
  "reply_options",
] as const;

const NOT_MESSAGE_SCOPED = [
  "status_update",
  "text_delta",
  "reasoning_delta",
  "text_replace",
  "queue_place",
  "persona_updated",
  "stage_shift",
  "image_preview",
  "image_failed",
  "photo_ideas",
  "mind_update",
  "reply_suggestions",
  "conversation_forked",
  "message_enhanced",
  "transcript",
  "error",
  "pong",
] as const;

function optionsFor(type: string) {
  const options = ServerMessageSchema.options as { shape: Record<string, unknown> }[];
  return options.find((option) => {
    const literal = option.shape.type as { value?: string };
    return literal?.value === type;
  });
}

function payloadKeys(option?: { shape: Record<string, unknown> }): string[] {
  if (!option) return [];
  let payload = option.shape.payload as
    | { shape?: Record<string, unknown>; unwrap?: () => unknown }
    | undefined;

  while (payload && !payload.shape && typeof payload.unwrap === "function") {
    payload = payload.unwrap() as typeof payload;
  }

  return [...Object.keys(option.shape), ...Object.keys(payload?.shape ?? {})];
}

describe("an event about one message names that message", () => {
  for (const type of MESSAGE_SCOPED) {
    it(`${type} carries message_id`, () => {
      const option = optionsFor(type);
      expect(option).toBeDefined();
      expect(payloadKeys(option)).toContain("message_id");
    });
  }
});

describe("the two lists together cover the whole protocol", () => {
  it("names every server event exactly once", () => {
    const declared = new Set<string>([...MESSAGE_SCOPED, ...NOT_MESSAGE_SCOPED]);
    const actual = (ServerMessageSchema.options as { shape: Record<string, unknown> }[]).map(
      (option) => (option.shape.type as { value: string }).value,
    );

    expect(actual.filter((type) => !declared.has(type))).toEqual([]);
    expect([...declared].filter((type) => !actual.includes(type))).toEqual([]);
  });
});
