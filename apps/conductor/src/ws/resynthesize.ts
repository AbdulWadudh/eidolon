import { CHAT_COPY } from "@eidolon/config";
import type { ResynthesizeAudioEvent } from "@eidolon/protocol";
import { TTS } from "@/config";
import { clearMessageAudio, getMessage } from "@/db";
import { getCharacter } from "@/db/characters";
import { synthesizeSpeech, ttsApiUrl } from "@/services/tts";
import { storeVoiceNote } from "@/services/voice-notes";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

function failed(ws: WebSocketSender, message: string): void {
  sendServerMessage(ws, {
    type: "error",
    payload: { code: "TTS_FAILED", message },
  });
}

export async function handleResynthesizeAudio(
  ws: WebSocketSender,
  event: ResynthesizeAudioEvent,
  signal: AbortSignal,
): Promise<void> {
  const message = getMessage(event.message_id);
  if (!message || message.content.trim().length === 0) {
    failed(ws, CHAT_COPY.nothingToSpeak);
    return;
  }

  if (!ttsApiUrl()) {
    failed(ws, CHAT_COPY.voiceUnconfigured);
    return;
  }

  clearMessageAudio(event.message_id);

  const voiceId = getCharacter(event.character_id)?.voice ?? TTS.voice;
  const audio = await synthesizeSpeech(message.content, voiceId, signal);
  if (signal.aborted) return;

  if (!audio) {
    failed(ws, CHAT_COPY.voiceFailed);
    return;
  }

  const note = await storeVoiceNote(event.character_id, event.message_id, audio);

  sendServerMessage(ws, {
    type: "audio_chunk",
    payload: {
      format: "mp3",
      data: note.url ? "" : audio,
      url: note.url ?? undefined,
      duration: note.durationSeconds ?? undefined,
      sentence_index: 0,
      message_id: event.message_id,
    },
  });
}
