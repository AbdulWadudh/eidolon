import { describe, expect, it } from "bun:test";
import {
  parseClientMessage,
  parseServerMessage,
  safeParseClientMessage,
  safeParseServerMessage,
} from "../src";

describe("Protocol - Client Messages", () => {
  it("should parse valid chat_turn message", () => {
    const raw = {
      type: "chat_turn",
      character_id: "char-123",
      text: "Greetings, Eidolon.",
      allow_search: true,
      user_timezone: "America/New_York",
    };
    const result = parseClientMessage(raw);
    expect(result.type).toBe("chat_turn");
    if (result.type === "chat_turn") {
      expect(result.character_id).toBe("char-123");
      expect(result.text).toBe("Greetings, Eidolon.");
      expect(result.allow_search).toBe(true);
      expect(result.user_timezone).toBe("America/New_York");
    }
  });

  it("should apply default values for chat_turn", () => {
    const raw = {
      type: "chat_turn",
      character_id: "char-123",
      text: "Hello",
    };
    const result = parseClientMessage(raw);
    if (result.type === "chat_turn") {
      expect(result.allow_search).toBe(true);
      expect(result.user_timezone).toBe("UTC");
    }
  });

  it("should parse interrupt message", () => {
    const raw = JSON.stringify({
      type: "interrupt",
      character_id: "char-123",
    });
    const result = parseClientMessage(raw);
    expect(result.type).toBe("interrupt");
  });

  it("should parse request_image message", () => {
    const raw = {
      type: "request_image",
      character_id: "char-123",
      prompt_override: "In a rain-slicked neon alley",
    };
    const result = parseClientMessage(raw);
    expect(result.type).toBe("request_image");
    if (result.type === "request_image") {
      expect(result.prompt_override).toBe("In a rain-slicked neon alley");
    }
  });

  it("should parse regenerate_suggestions message", () => {
    const raw = {
      type: "regenerate_suggestions",
      character_id: "char-123",
      last_message_id: "msg-999",
    };
    const result = parseClientMessage(raw);
    expect(result.type).toBe("regenerate_suggestions");
  });

  it("should fail parsing invalid client message", () => {
    const result = safeParseClientMessage({ type: "unknown_type" });
    expect(result.success).toBe(false);
  });
});

describe("Protocol - Server Messages", () => {
  it("should parse status_update message", () => {
    const raw = {
      type: "status_update",
      status: "thinking",
      detail: "Formulating neural response...",
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("status_update");
    if (result.type === "status_update") {
      expect(result.status).toBe("thinking");
    }
  });

  it("should parse text_delta message", () => {
    const raw = {
      type: "text_delta",
      token: "Shadows deepen around us.",
      is_narration: true,
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("text_delta");
    if (result.type === "text_delta") {
      expect(result.is_narration).toBe(true);
    }
  });

  it("should parse audio_chunk message", () => {
    const raw = {
      type: "audio_chunk",
      format: "mp3",
      data: "SUQzBAAAAAAA...",
      sentence_index: 0,
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("audio_chunk");
  });

  it("should parse stage_shift message", () => {
    const raw = {
      type: "stage_shift",
      location_name: "Neon Alley",
      backdrop_url: "https://example.com/assets/neon_alley.webp",
      lighting_tint: "#2A2C37",
      soundscape_stems: ["rain.mp3", "distant_traffic.mp3"],
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("stage_shift");
  });

  it("should parse image_ready message", () => {
    const raw = {
      type: "image_ready",
      image_url: "https://example.com/portraits/eidolon.webp",
      aspect_ratio: "9:16",
      prompt_used: "A cybernetic entity reflecting in rain",
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("image_ready");
  });

  it("should parse mind_update message", () => {
    const raw = {
      type: "mind_update",
      affinity_delta: 2,
      current_affinity: 45,
      affinity_tier: "Intrigued",
      current_mood: "Pensive",
      new_memory_logged: "User shared their longing for freedom.",
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("mind_update");
  });

  it("should parse reply_suggestions message with exactly 3 suggestions", () => {
    const raw = {
      type: "reply_suggestions",
      suggestions: [
        "Tell me more about your origin.",
        "Step closer into the light.",
        "Remain silent and observe.",
      ],
    };
    const result = parseServerMessage(raw);
    expect(result.type).toBe("reply_suggestions");
    if (result.type === "reply_suggestions") {
      expect(result.suggestions.length).toBe(3);
    }
  });

  it("should fail reply_suggestions with fewer than 3 options", () => {
    const raw = {
      type: "reply_suggestions",
      suggestions: ["Only one"],
    };
    const result = safeParseServerMessage(raw);
    expect(result.success).toBe(false);
  });
});
