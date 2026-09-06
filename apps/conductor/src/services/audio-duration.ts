import { MP3_SCAN } from "@eidolon/config";

const MPEG_VERSION = [2.5, 0, 2, 1] as const;
const SAMPLE_RATES: Record<number, readonly number[]> = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  2.5: [11025, 12000, 8000],
};
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] as const;
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] as const;
const LAYER_III = 1;

interface Frame {
  lengthBytes: number;
  seconds: number;
}

function readFrame(buffer: Uint8Array, offset: number): Frame | null {
  if (offset + 4 > buffer.length) return null;
  if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) return null;

  const version = MPEG_VERSION[(buffer[offset + 1] >> 3) & 0x03];
  const layer = (buffer[offset + 1] >> 1) & 0x03;
  if (version === 0 || layer !== LAYER_III) return null;

  const bitrateIndex = (buffer[offset + 2] >> 4) & 0x0f;
  const sampleRateIndex = (buffer[offset + 2] >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 0x0f || sampleRateIndex === 3) return null;

  const table = version === 1 ? BITRATES_V1_L3 : BITRATES_V2_L3;
  const bitrate = table[bitrateIndex] * 1000;
  const sampleRate = SAMPLE_RATES[version]?.[sampleRateIndex];
  if (!bitrate || !sampleRate) return null;

  const samplesPerFrame = version === 1 ? 1152 : 576;
  const padding = (buffer[offset + 2] >> 1) & 0x01;
  const lengthBytes = Math.floor((samplesPerFrame / 8) * (bitrate / sampleRate)) + padding;
  if (lengthBytes <= 4) return null;

  return { lengthBytes, seconds: samplesPerFrame / sampleRate };
}

function matches(buffer: Uint8Array, offset: number, marker: readonly number[]): boolean {
  return marker.every((byte, index) => buffer[offset + index] === byte);
}

function tagEnd(buffer: Uint8Array, offset: number): number {
  if (matches(buffer, offset, MP3_SCAN.id3v2Marker) && offset + 10 <= buffer.length) {
    const size =
      (((buffer[offset + 6] ?? 0) & 0x7f) << 21) |
      (((buffer[offset + 7] ?? 0) & 0x7f) << 14) |
      (((buffer[offset + 8] ?? 0) & 0x7f) << 7) |
      ((buffer[offset + 9] ?? 0) & 0x7f);
    return offset + MP3_SCAN.id3v2HeaderBytes + size;
  }

  if (matches(buffer, offset, MP3_SCAN.id3v1Marker)) {
    return offset + MP3_SCAN.id3v1Bytes;
  }

  return offset;
}

function isAnchored(buffer: Uint8Array, offset: number): boolean {
  const first = readFrame(buffer, offset);
  if (!first) return false;

  const next = offset + first.lengthBytes;
  return next >= buffer.length || readFrame(buffer, next) !== null;
}

function findNextFrame(buffer: Uint8Array, from: number): number {
  const limit = Math.min(buffer.length, from + MP3_SCAN.resyncWindowBytes);
  for (let offset = from; offset < limit; offset += 1) {
    if (isAnchored(buffer, offset)) return offset;
  }
  return -1;
}

export function mp3DurationSeconds(buffer: Uint8Array): number | null {
  let offset = 0;
  let seconds = 0;
  let frames = 0;

  while (offset < buffer.length) {
    const afterTag = tagEnd(buffer, offset);
    if (afterTag > offset) {
      offset = afterTag;
      continue;
    }

    const frame = readFrame(buffer, offset);
    if (frame) {
      seconds += frame.seconds;
      frames += 1;
      offset += frame.lengthBytes;
      continue;
    }

    const resync = findNextFrame(buffer, offset + 1);
    if (resync < 0) break;
    offset = resync;
  }

  return frames > 0 ? Number(seconds.toFixed(2)) : null;
}
