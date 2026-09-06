import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { TRANSCRIBE } from "@eidolon/config";
import {
  cleanTranscript,
  isTranscriptionConfigured,
  sttApiUrl,
  transcribeAudio,
} from "@/services/transcribe";
import { handleVoiceInput } from "@/ws/voice-input";

const saved = process.env.STT_API_URL;

function setStt(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.STT_API_URL;
    return;
  }
  process.env.STT_API_URL = value;
}

function serve(handler: (request: Request) => Response | Promise<Response>) {
  return Bun.serve({ port: 0, fetch: handler });
}

beforeEach(() => {
  setStt(undefined);
});

afterAll(() => {
  setStt(saved);
});

describe("configuration", () => {
  it("reports itself unconfigured when no node is set", () => {
    expect(sttApiUrl()).toBe("");
    expect(isTranscriptionConfigured()).toBe(false);
  });

  it("reports itself configured once a node is named", () => {
    setStt("http://127.0.0.1:9999/v1");
    expect(isTranscriptionConfigured()).toBe(true);
  });
});

describe("cleanTranscript", () => {
  it("collapses the whitespace a recogniser leaves behind", () => {
    expect(cleanTranscript("  Oh   really \n now ")).toBe("Oh really now");
  });

  it("caps a runaway transcript", () => {
    expect(cleanTranscript("a".repeat(TRANSCRIBE.maxChars + 500))).toHaveLength(
      TRANSCRIBE.maxChars,
    );
  });

  it("returns nothing for silence", () => {
    expect(cleanTranscript("   \n  ")).toBe("");
  });
});

describe("transcribeAudio", () => {
  it("returns null when no node is configured", async () => {
    expect(await transcribeAudio(Buffer.from("abc"), "audio/m4a")).toBeNull();
  });

  it("returns null for an empty recording", async () => {
    setStt("http://127.0.0.1:9999/v1");
    expect(await transcribeAudio(Buffer.alloc(0), "audio/m4a")).toBeNull();
  });

  it("posts the audio as multipart and reads the text back", async () => {
    let seenPath = "";
    let seenModel = "";
    let seenBytes = 0;

    const server = serve(async (request) => {
      seenPath = new URL(request.url).pathname;
      const form = await request.formData();
      seenModel = String(form.get("model"));
      const file = form.get(TRANSCRIBE.formField);
      seenBytes = file instanceof File ? file.size : 0;
      return Response.json({ text: "  Oh really  " });
    });

    setStt(`http://127.0.0.1:${server.port}/v1`);
    const heard = await transcribeAudio(Buffer.from("0123456789"), "audio/m4a");
    server.stop(true);

    expect(heard).toBe("Oh really");
    expect(seenPath).toBe(`/v1${TRANSCRIBE.path}`);
    expect(seenModel).toBe(TRANSCRIBE.model);
    expect(seenBytes).toBe(10);
  });

  it("returns null when the node refuses the request", async () => {
    const server = serve(() => new Response("nope", { status: 500 }));
    setStt(`http://127.0.0.1:${server.port}/v1`);

    const heard = await transcribeAudio(Buffer.from("abc"), "audio/m4a");
    server.stop(true);

    expect(heard).toBeNull();
  });

  it("returns null when the node heard only silence", async () => {
    const server = serve(() => Response.json({ text: "   " }));
    setStt(`http://127.0.0.1:${server.port}/v1`);

    const heard = await transcribeAudio(Buffer.from("abc"), "audio/m4a");
    server.stop(true);

    expect(heard).toBeNull();
  });

  it("returns null rather than throwing when the node is unreachable", async () => {
    setStt("http://127.0.0.1:1/v1");
    expect(await transcribeAudio(Buffer.from("abc"), "audio/m4a")).toBeNull();
  });

  it("gives up quietly when the caller aborts", async () => {
    const server = serve(async () => {
      await Bun.sleep(500);
      return Response.json({ text: "too late" });
    });
    setStt(`http://127.0.0.1:${server.port}/v1`);

    const controller = new AbortController();
    const pending = transcribeAudio(Buffer.from("abc"), "audio/m4a", controller.signal);
    controller.abort();

    expect(await pending).toBeNull();
    server.stop(true);
  });
});

describe("the voice_input socket event", () => {
  function collect() {
    const sent: { type: string; payload?: Record<string, unknown> }[] = [];
    return { ws: { send: (raw: string) => sent.push(JSON.parse(raw)) }, sent };
  }

  function input(data: string) {
    return {
      type: "voice_input" as const,
      character_id: "emma",
      format: "audio/m4a",
      data,
      allow_search: false,
      user_timezone: "UTC",
      live_voice: true,
    };
  }

  it("refuses when no transcription node is configured", async () => {
    const { ws, sent } = collect();
    await handleVoiceInput(ws, input("QUJD"), new AbortController().signal);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.type).toBe("error");
    expect(sent[0]?.payload?.code).toBe("STT_UNCONFIGURED");
  });

  it("refuses a recording with no audio in it", async () => {
    setStt("http://127.0.0.1:9999/v1");
    const { ws, sent } = collect();
    await handleVoiceInput(ws, input(""), new AbortController().signal);

    expect(sent[0]?.payload?.code).toBe("STT_BAD_AUDIO");
  });

  it("reports an empty transcript rather than running a blank turn", async () => {
    const server = serve(() => Response.json({ text: "" }));
    setStt(`http://127.0.0.1:${server.port}/v1`);

    const { ws, sent } = collect();
    await handleVoiceInput(ws, input("QUJDRA=="), new AbortController().signal);
    server.stop(true);

    expect(sent.map((entry) => entry.type)).toEqual(["status_update", "transcript", "error"]);
    expect(sent[1]?.payload?.text).toBe("");
    expect(sent[2]?.payload?.code).toBe("STT_EMPTY");
  });

  it("stops when the turn is aborted mid-transcription", async () => {
    const server = serve(async () => {
      await Bun.sleep(300);
      return Response.json({ text: "hello" });
    });
    setStt(`http://127.0.0.1:${server.port}/v1`);

    const controller = new AbortController();
    const { ws, sent } = collect();
    const pending = handleVoiceInput(ws, input("QUJDRA=="), controller.signal);
    controller.abort();
    await pending;
    server.stop(true);

    expect(sent.some((entry) => entry.type === "transcript")).toBe(false);
  });
});
