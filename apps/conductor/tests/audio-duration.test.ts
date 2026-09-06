import { describe, expect, it } from "bun:test";
import { mp3DurationSeconds } from "@/services/audio-duration";

const FRAME_BYTES = 384;
const FRAME_SECONDS = 576 / 24000;

function mpeg2Layer3Frame(): Uint8Array {
  const frame = new Uint8Array(FRAME_BYTES);
  frame[0] = 0xff;
  frame[1] = 0xf3;
  frame[2] = 0xc4;
  frame[3] = 0xc4;
  return frame;
}

function stream(frameCount: number, id3Bytes = 0): Uint8Array {
  const header = new Uint8Array(id3Bytes);
  if (id3Bytes > 0) {
    header[0] = 0x49;
    header[1] = 0x44;
    header[2] = 0x33;
    const size = id3Bytes - 10;
    header[6] = (size >> 21) & 0x7f;
    header[7] = (size >> 14) & 0x7f;
    header[8] = (size >> 7) & 0x7f;
    header[9] = size & 0x7f;
  }

  const out = new Uint8Array(id3Bytes + frameCount * FRAME_BYTES);
  out.set(header, 0);
  for (let i = 0; i < frameCount; i += 1) {
    out.set(mpeg2Layer3Frame(), id3Bytes + i * FRAME_BYTES);
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

describe("mp3 duration", () => {
  it("sums frame durations", () => {
    expect(mp3DurationSeconds(stream(10))).toBeCloseTo(10 * FRAME_SECONDS, 2);
  });

  it("skips an ID3v2 tag before the first frame", () => {
    expect(mp3DurationSeconds(stream(25, 44))).toBeCloseTo(25 * FRAME_SECONDS, 2);
  });

  it("returns null when there is no frame to read", () => {
    expect(mp3DurationSeconds(new Uint8Array(64))).toBeNull();
  });

  it("returns null for an empty buffer", () => {
    expect(mp3DurationSeconds(new Uint8Array(0))).toBeNull();
  });

  it("counts every sentence in a concatenated stream, not just the first", () => {
    const joined = concat(stream(6, 44), stream(9, 44), stream(5, 44));
    expect(mp3DurationSeconds(joined)).toBeCloseTo(20 * FRAME_SECONDS, 2);
  });

  it("resyncs across a gap of junk between two runs of frames", () => {
    const joined = concat(stream(7), new Uint8Array(12), stream(4));
    expect(mp3DurationSeconds(joined)).toBeCloseTo(11 * FRAME_SECONDS, 2);
  });

  it("stops at a trailing ID3v1 tag rather than reading it as audio", () => {
    const tag = new Uint8Array(128);
    tag[0] = 0x54;
    tag[1] = 0x41;
    tag[2] = 0x47;
    expect(mp3DurationSeconds(concat(stream(8), tag))).toBeCloseTo(8 * FRAME_SECONDS, 2);
  });
});
