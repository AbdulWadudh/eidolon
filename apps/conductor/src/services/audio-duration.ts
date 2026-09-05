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

function audioStart(buffer: Uint8Array): number {
  const hasId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
  if (!hasId3 || buffer.length < 10) return 0;
  const size =
    ((buffer[6] & 0x7f) << 21) |
    ((buffer[7] & 0x7f) << 14) |
    ((buffer[8] & 0x7f) << 7) |
    (buffer[9] & 0x7f);
  return 10 + size;
}

export function mp3DurationSeconds(buffer: Uint8Array): number | null {
  let offset = audioStart(buffer);
  let seconds = 0;
  let frames = 0;

  while (offset < buffer.length) {
    const frame = readFrame(buffer, offset);
    if (!frame) {
      offset += 1;
      if (frames > 0) break;
      continue;
    }
    seconds += frame.seconds;
    frames += 1;
    offset += frame.lengthBytes;
  }

  return frames > 0 ? Number(seconds.toFixed(2)) : null;
}
