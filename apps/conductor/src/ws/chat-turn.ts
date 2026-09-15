import { STATUS_COPY } from "@eidolon/config";
import { type ChatTurnEvent, splitInfluence } from "@eidolon/protocol";
import { SUGGESTIONS, TTS } from "@/config";
import { appendMessage, getCharacterCard, getRecentMessages } from "@/db";
import { forkForUser, getCharacter } from "@/db/characters";
import { maybeSummarizeChronicle } from "@/orchestrator/chronicle";
import { rememberExchange } from "@/orchestrator/memory-manager";
import { scheduleProactiveFollowUp } from "@/orchestrator/proactive";
import { assemblePrompt } from "@/orchestrator/prompt-builder";
import { settleMind } from "@/orchestrator/turn-mind";
import { userVoice } from "@/orchestrator/user";
import type { ChatMessage } from "@/services/llm";
import { forHistory } from "@/services/photo-line";
import { exampleLines } from "@/services/self-reference";
import { fallbackSuggestions, formatScene, generateReplySuggestions } from "@/services/suggestions";
import { synthesizeSpeech } from "@/services/tts";
import { storeVoiceNote } from "@/services/voice-notes";
import type { WebSocketSender } from "@/ws/protocol";
import { sendServerMessage } from "@/ws/protocol";
import { streamReply } from "@/ws/reply-stream";
import { createVoiceStream } from "@/ws/voice-turn";

export { hasTemporalMarker as shouldSearch } from "@/orchestrator/search-trigger";

export async function handleChatTurn(
  ws: WebSocketSender,
  userId: string,
  event: ChatTurnEvent,
  signal: AbortSignal,
  options: { recordUserTurn?: boolean } = {},
): Promise<void> {
  const owned = forkForUser(event.character_id, userId);
  if (owned) {
    sendServerMessage(ws, {
      type: "conversation_forked",
      payload: { from_character_id: event.character_id, character_id: owned.id },
    });
  }

  // Everything after this point — the prompt, the messages, the art — belongs to the
  // copy this user owns, never to the character someone else published.
  const characterId = owned?.id ?? event.character_id;
  const userText = event.text;
  const { spoken, influences } = splitInfluence(userText);
  if (signal.aborted) return;

  const assembled = await assemblePrompt({
    characterId,
    userId,
    userText: spoken,
    allowSearch: event.allow_search,
    moodOverride: event.mood,
    influences,
    signal,
    onStatus: (status, detail) => {
      sendServerMessage(ws, { type: "status_update", payload: { status, detail } });
    },
  });

  if (signal.aborted) return;

  sendServerMessage(ws, {
    type: "status_update",
    payload: { status: "thinking", detail: STATUS_COPY.thinking.line },
  });

  const history = assembled.messages.filter(
    (message): message is ChatMessage => message.role === "assistant",
  );

  const card = getCharacter(characterId);
  const voiceId = card?.voice ?? TTS.voice;
  const voice = event.live_voice ? createVoiceStream(ws, { characterId, voiceId, signal }) : null;

  const outcome = await streamReply(
    ws,
    assembled.messages,
    signal,
    [
      ...history.map((entry) => entry.content),
      ...exampleLines(card?.exampleDialogue ?? "", assembled.characterName),
    ],
    assembled.characterName,
    { onSpeech: voice ? (text) => voice.push(text) : undefined },
  );

  if (signal.aborted) return;

  const reply = outcome.reply.trim();
  if (options.recordUserTurn !== false) appendMessage(characterId, "user", userText, userId);
  const assistantId =
    reply.length > 0 ? appendMessage(characterId, "assistant", reply, userId) : null;

  if (assistantId) {
    sendServerMessage(ws, {
      type: "message_committed",
      payload: { message_id: assistantId },
    });
  }

  const turn: ChatMessage[] = [
    { role: "user", content: spoken },
    { role: "assistant", content: reply },
  ];

  void rememberExchange({ characterId, userText: spoken, assistantText: reply }).catch(
    (error: unknown) => {
      console.error("[memory] could not index the turn", error);
    },
  );

  void maybeSummarizeChronicle(characterId, userId).catch((error: unknown) => {
    console.error("[chronicle] could not queue a summary", error);
  });

  void scheduleProactiveFollowUp(
    characterId,
    userId,
    formatScene(turn, assembled.characterName),
  ).catch((error: unknown) => {
    console.error("[proactive] could not arm the follow-up", error);
  });

  sendServerMessage(ws, { type: "status_update", payload: { status: "speaking" } });

  const [audio, suggestions] = await Promise.all([
    voice ? Promise.resolve(null) : synthesizeSpeech(reply, voiceId, signal),
    SUGGESTIONS.autoGenerate
      ? generateReplySuggestions(
          turn,
          {
            characterName: assembled.characterName,
            tier: assembled.tier,
            user: userVoice(characterId, userId),
          },
          signal,
        )
      : Promise.resolve(null),
  ]);

  if (voice) await voice.finish(assistantId);

  if (audio) {
    const note = assistantId
      ? await storeVoiceNote(characterId, assistantId, audio)
      : { url: null, durationSeconds: null };
    sendServerMessage(ws, {
      type: "audio_chunk",
      payload: {
        format: "mp3",
        data: note.url ? "" : audio,
        url: note.url ?? undefined,
        duration: note.durationSeconds ?? undefined,
        sentence_index: 0,
      },
    });
  }

  if (suggestions) {
    sendServerMessage(ws, { type: "reply_suggestions", payload: { suggestions } });
  }

  if (signal.aborted) return;

  await settleMind(ws, {
    characterId,
    userId,
    characterName: assembled.characterName,
    mindBlock: outcome.mindBlock,
    scene: formatScene(turn, assembled.characterName),
    signal,
  });

  sendServerMessage(ws, { type: "status_update", payload: { status: "idle" } });
}

export async function handleRegenerateSuggestions(
  ws: WebSocketSender,
  userId: string,
  characterId: string,
  signal: AbortSignal,
): Promise<void> {
  const card = getCharacterCard(characterId, userId);
  const recent = getRecentMessages(characterId, userId, SUGGESTIONS.sceneTurns)
    .map((entry) => ({
      role: entry.role,
      content: forHistory(entry.role, entry.content, entry.imageCaption),
    }))
    .filter((entry) => entry.content.trim().length > 0);

  const suggestions =
    recent.length > 0
      ? await generateReplySuggestions(
          recent,
          {
            characterName: card.name,
            tier: card.tier,
            user: userVoice(characterId, userId),
          },
          signal,
        )
      : fallbackSuggestions();

  sendServerMessage(ws, { type: "reply_suggestions", payload: { suggestions } });
}
