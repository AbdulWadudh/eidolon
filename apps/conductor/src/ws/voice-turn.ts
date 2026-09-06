import { QUEUE_JOBS, TTS } from "@eidolon/config";
import { jobKey } from "@/queue/job-id";
import { enqueueUploadJob } from "@/queue/queues";
import { mp3DurationSeconds } from "@/services/audio-duration";
import { concatMp3, synthesizeSentence } from "@/services/voice";
import { createSentenceBuffer } from "@/utils/sentence-buffer";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

export interface VoiceStreamOptions {
  characterId: string;
  voiceId?: string;
  signal: AbortSignal;
}

export interface VoiceStream {
  push(token: string): void;
  finish(messageId: string | null): Promise<VoiceStreamResult>;
  spoken(): string[];
}

export interface VoiceStreamResult {
  sentences: number;
  bytes: number;
  uploadJobId: string | null;
}

export function createVoiceStream(
  ws: WebSocketSender,
  { characterId, voiceId, signal }: VoiceStreamOptions,
): VoiceStream {
  const buffer = createSentenceBuffer();
  const parts: Buffer[] = [];
  const said: string[] = [];
  let queue: Promise<void> = Promise.resolve();
  let nextIndex = 0;

  function speak(sentence: string): void {
    const sentenceIndex = nextIndex;
    nextIndex += 1;
    said.push(sentence);

    queue = queue
      .then(async () => {
        if (signal.aborted) return;

        const audio = await synthesizeSentence(sentence, voiceId ?? TTS.voice, signal);
        if (signal.aborted || audio.byteLength === 0) return;

        parts.push(audio);
        sendServerMessage(ws, {
          type: "audio_chunk",
          payload: {
            format: "mp3",
            data: audio.toString("base64"),
            duration: mp3DurationSeconds(audio) ?? undefined,
            sentence_index: sentenceIndex,
            text: sentence,
            live: true,
          },
        });
      })
      .catch((error: unknown) => {
        console.error(`[voice] sentence ${sentenceIndex} could not be spoken`, error);
      });
  }

  return {
    push(token) {
      for (const sentence of buffer.push(token)) speak(sentence);
    },

    async finish(messageId) {
      for (const sentence of buffer.flush()) speak(sentence);
      await queue;

      const merged = concatMp3(parts);
      if (merged.byteLength === 0) {
        return { sentences: said.length, bytes: 0, uploadJobId: null };
      }

      sendServerMessage(ws, {
        type: "audio_chunk",
        payload: {
          format: "mp3",
          data: merged.toString("base64"),
          duration: mp3DurationSeconds(merged) ?? undefined,
          sentence_index: 0,
          live: false,
        },
      });

      if (!messageId) {
        return { sentences: said.length, bytes: merged.byteLength, uploadJobId: null };
      }

      const uploadJobId =
        (await enqueueUploadJob(
          QUEUE_JOBS.uploadAudio,
          {
            characterId,
            filename: `${messageId}.mp3`,
            bufferBase64: merged.toString("base64"),
            messageId,
          },
          { jobId: jobKey("audio", messageId) },
        ).catch((error: unknown) => {
          console.error("[voice] the archive upload could not be queued", error);
          return null;
        })) ?? null;

      return { sentences: said.length, bytes: merged.byteLength, uploadJobId };
    },

    spoken() {
      return [...said];
    },
  };
}
