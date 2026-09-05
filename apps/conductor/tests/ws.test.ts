import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { apiPath } from "@eidolon/config";
import { parseServerMessage, type ServerMessage } from "@eidolon/protocol";
import { PAIRING_SECRET } from "@/auth";
import { app } from "@/index";
import { websocket } from "@/ws";

describe("Conductor WebSocket Router", () => {
  let server: ReturnType<typeof Bun.serve>;
  let wsUrl: string;

  beforeAll(() => {
    // Start ephemeral server for WebSocket integration tests
    server = Bun.serve({
      port: 0,
      fetch: app.fetch,
      websocket,
    });
    wsUrl = `ws://localhost:${server.port}${apiPath("ws")}`;
  });

  afterAll(() => {
    server.stop(true);
  });

  it("rejects unauthorized HTTP upgrade without token", async () => {
    const res = await app.request(apiPath("ws"));
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized HTTP upgrade with invalid token", async () => {
    const res = await app.request(`${apiPath("ws")}?token=invalid_secret`);
    expect(res.status).toBe(401);
  });

  it("accepts authorized connection and handles ping", async () => {
    const ws = new WebSocket(`${wsUrl}?token=${PAIRING_SECRET}`);

    const messagePromise = new Promise<ServerMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for pong")), 4000);
      ws.onmessage = (event) => {
        clearTimeout(timer);
        try {
          const parsed = parseServerMessage(String(event.data));
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    ws.send(JSON.stringify({ type: "ping" }));
    const reply = await messagePromise;

    expect(reply.type).toBe("status_update");
    if (reply.type === "status_update") {
      expect(reply.status).toBe("idle");
      expect(reply.detail).toBe("pong");
    }

    ws.close();
  });

  it("streams a turn and appraises it, without spending calls on reply options", async () => {
    const ws = new WebSocket(`${wsUrl}?token=${PAIRING_SECRET}`);

    const receivedMessages: ServerMessage[] = [];

    const completionPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Timeout waiting for chat completion")),
        6000,
      );

      ws.onmessage = (event) => {
        try {
          const parsed = parseServerMessage(String(event.data));
          receivedMessages.push(parsed);

          // Once mind_update is received, the chat turn is complete
          if (parsed.type === "mind_update") {
            clearTimeout(timer);
            resolve();
          }
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    // Dispatch chat turn
    ws.send(
      JSON.stringify({
        type: "chat_turn",
        character_id: "char-123",
        text: "Hello Eidolon, how are you today?",
        allow_search: false,
      }),
    );

    await completionPromise;

    const messageTypes = receivedMessages.map((m) => m.type);
    expect(messageTypes).toContain("status_update");
    expect(messageTypes).toContain("text_delta");
    expect(messageTypes).toContain("mind_update");

    // Reply options cost three model calls and most turns are answered by
    // typing, so they are only produced when the reader asks for them.
    expect(messageTypes).not.toContain("reply_suggestions");

    ws.close();
  });

  it("produces reply options when they are actually asked for", async () => {
    const ws = new WebSocket(`${wsUrl}?token=${PAIRING_SECRET}`);

    const suggestions = new Promise<ServerMessage>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout waiting for suggestions")), 20000);
      ws.onmessage = (event) => {
        const parsed = parseServerMessage(String(event.data));
        if (parsed.type !== "reply_suggestions") return;
        clearTimeout(timer);
        resolve(parsed);
      };
      ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
    });

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    ws.send(
      JSON.stringify({
        type: "regenerate_suggestions",
        character_id: "char-123",
        last_message_id: "new-chat",
      }),
    );

    const message = await suggestions;
    if (message.type === "reply_suggestions") {
      expect(message.suggestions).toHaveLength(3);
    }

    ws.close();
  });
});
