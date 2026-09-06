import { CALL_COPY, SPEECH } from "@eidolon/config";
import type { VoiceInputEvent } from "@eidolon/protocol";
import { isTranscriptionConfigured, transcribeAudio } from "@/services/transcribe";
import { handleChatTurn } from "@/ws/chat-turn";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

export async function handleVoiceInput(
  ws: WebSocketSender,
  event: VoiceInputEvent,
  signal: AbortSignal,
): Promise<void> {
  if (!isTranscriptionConfigured()) {
    sendServerMessage(ws, {
      type: "error",
      payload: { code: "STT_UNCONFIGURED", message: CALL_COPY.noRecogniser },
    });
    return;
  }

  const audio = Buffer.from(event.data, "base64");
  if (audio.byteLength === 0 || audio.byteLength > SPEECH.maxUploadBytes) {
    sendServerMessage(ws, {
      type: "error",
      payload: { code: "STT_BAD_AUDIO", message: CALL_COPY.heardNothing },
    });
    return;
  }

  sendServerMessage(ws, {
    type: "status_update",
    payload: { status: "thinking", detail: CALL_COPY.transcribing },
  });

  const heard = await transcribeAudio(audio, event.format, signal);
  if (signal.aborted) return;

  if (!heard) {
    sendServerMessage(ws, { type: "transcript", payload: { text: "", is_final: true } });
    sendServerMessage(ws, {
      type: "error",
      payload: { code: "STT_EMPTY", message: CALL_COPY.heardNothing },
    });
    return;
  }

  sendServerMessage(ws, { type: "transcript", payload: { text: heard, is_final: true } });

  await handleChatTurn(
    ws,
    {
      type: "chat_turn",
      character_id: event.character_id,
      text: heard,
      allow_search: event.allow_search,
      user_timezone: event.user_timezone,
      live_voice: event.live_voice,
    },
    signal,
  );
}
