import { afterEach, describe, expect, it } from "bun:test";
import { leaksReasoning } from "@/services/reasoning";
import type { WebSocketSender } from "@/ws/protocol";
import { streamReply } from "@/ws/reply-stream";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function sse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        const frame = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
        controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function reasoningSse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        const frame = JSON.stringify({ choices: [{ delta: { reasoning_content: chunk } }] });
        controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
      }
      const spoken = JSON.stringify({ choices: [{ delta: { content: "Still here." } }] });
      controller.enqueue(encoder.encode(`data: ${spoken}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

function collector(): { ws: WebSocketSender; deltas: () => string[] } {
  const seen: string[] = [];
  return {
    ws: {
      send(data: string) {
        const parsed = JSON.parse(data) as {
          type: string;
          payload?: { token?: string; text?: string };
        };
        if (parsed.type === "text_delta" && parsed.payload?.token) seen.push(parsed.payload.token);
        if (parsed.type === "text_replace" && parsed.payload?.text) seen.push(parsed.payload.text);
      },
    },
    deltas: () => seen,
  };
}

const MESSAGES = [
  { role: "system", content: "You are Emma." },
  { role: "user", content: "you ok?" },
];

describe("a reply carries no reasoning to the user or the database", () => {
  it("strips an inline block split across stream chunks", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        sse(["<thi", "nk>she sounds worried, play it down</thi", "nk>Yeah, ", "just tired."]),
      )) as unknown as typeof fetch;

    const sink = collector();
    const outcome = await streamReply(sink.ws, MESSAGES, new AbortController().signal);

    expect(leaksReasoning(outcome.reply)).toBe(false);
    expect(outcome.reply).toContain("just tired");
    for (const delta of sink.deltas()) {
      expect(leaksReasoning(delta)).toBe(false);
    }
  });

  it("strips a block the template opened before the stream began, when thinking was asked for", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        sse(["weighing how much to admit", "</think>", "Long day. You?"]),
      )) as unknown as typeof fetch;

    const sink = collector();
    const outcome = await streamReply(sink.ws, MESSAGES, new AbortController().signal, [], "", {
      think: true,
    });

    expect(leaksReasoning(outcome.reply)).toBe(false);
    expect(outcome.reply).not.toContain("weighing how much");
    expect(outcome.reply).toContain("Long day");
  });

  it("still strips a paired block when thinking was not asked for", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        sse(["<think>uninvited</think>", "Long day. You?"]),
      )) as unknown as typeof fetch;

    const sink = collector();
    const outcome = await streamReply(sink.ws, MESSAGES, new AbortController().signal);

    expect(leaksReasoning(outcome.reply)).toBe(false);
    expect(outcome.reply).not.toContain("uninvited");
  });

  it("never speaks a reasoning_content delta", async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        reasoningSse(["she is checking in", " on me", " after yesterday"]),
      )) as unknown as typeof fetch;

    const sink = collector();
    const outcome = await streamReply(sink.ws, MESSAGES, new AbortController().signal);

    expect(outcome.reply).toBe("Still here.");
    expect(outcome.reply).not.toContain("checking in");
    expect(sink.deltas().join("")).not.toContain("yesterday");
  });
});
