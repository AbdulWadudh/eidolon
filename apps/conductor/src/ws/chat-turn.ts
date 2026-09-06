import { STATUS_COPY, SUGGESTIONS, TTS } from "@eidolon/config";
import { type ChatTurnEvent, splitInfluence } from "@eidolon/protocol";
import { appendMessage, getCharacterCard, getRecentMessages } from "@/db";
import { getCharacter } from "@/db/characters";
import { maybeSummarizeChronicle } from "@/orchestrator/chronicle";
import { rememberExchange } from "@/orchestrator/memory-manager";
import { scheduleProactiveFollowUp } from "@/orchestrator/proactive";
import { assemblePrompt } from "@/orchestrator/prompt-builder";
import { settleMind } from "@/orchestrator/turn-mind";
import type { ChatMessage } from "@/services/llm";
import { forHistory } from "@/services/photo-line";
import { exampleLines } from "@/services/self-reference";
import { fallbackSuggestions, formatScene, generateReplySuggestions } from "@/services/suggestions";
import { synthesizeSpeech } from "@/services/tts";
import { storeVoiceNote } from "@/services/voice-notes";
import type { WebSocketSender } from "@/ws/protocol";
import { sendServerMessage } from "@/ws/protocol";
import { streamReply } from "@/ws/reply-stream";

export { hasTemporalMarker as shouldSearch } from "@/orchestrator/search-trigger";

export async function handleChatTurn(
  ws: WebSocketSender,
  event: ChatTurnEvent,
  signal: AbortSignal,
): Promise<void> {
  const characterId = event.character_id;
  const userText = event.text;
  const { spoken, influences } = splitInfluence(userText);
  if (signal.aborted) return;

  const assembled = await assemblePrompt({
    characterId,
    userText: spoken,
    allowSearch: event.allow_search,
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

  const outcome = await streamReply(
    ws,
    assembled.messages,
    signal,
    [
      ...history.map((entry) => entry.content),
      ...exampleLines(getCharacter(characterId)?.exampleDialogue ?? "", assembled.characterName),
    ],
    assembled.characterName,
  );

  if (signal.aborted) return;

  const reply = outcome.reply.trim();
  appendMessage(characterId, "user", userText);
  const assistantId = reply.length > 0 ? appendMessage(characterId, "assistant", reply) : null;

  const turn: ChatMessage[] = [
    { role: "user", content: spoken },
    { role: "assistant", content: reply },
  ];

  void rememberExchange({ characterId, userText: spoken, assistantText: reply }).catch(
    (error: unknown) => {
      console.error("[memory] could not index the turn", error);
    },
  );

  void maybeSummarizeChronicle(characterId).catch((error: unknown) => {
    console.error("[chronicle] could not queue a summary", error);
  });

  void scheduleProactiveFollowUp(characterId, formatScene(turn, assembled.characterName)).catch(
    (error: unknown) => {
      console.error("[proactive] could not arm the follow-up", error);
    },
  );

  sendServerMessage(ws, { type: "status_update", payload: { status: "speaking" } });

  // Reply options cost three model calls, and most turns are answered by typing.
  // They are generated when the reader asks for them, not on every turn.
  const [audio, suggestions] = await Promise.all([
    synthesizeSpeech(reply, getCharacter(characterId)?.voice ?? TTS.voice, signal),
    SUGGESTIONS.autoGenerate
      ? generateReplySuggestions(
          turn,
          { characterName: assembled.characterName, tier: assembled.tier },
          signal,
        )
      : Promise.resolve(null),
  ]);

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
    characterName: assembled.characterName,
    mindBlock: outcome.mindBlock,
    scene: formatScene(turn, assembled.characterName),
    signal,
  });

  sendServerMessage(ws, { type: "status_update", payload: { status: "idle" } });
}

export async function handleRegenerateSuggestions(
  ws: WebSocketSender,
  characterId: string,
  signal: AbortSignal,
): Promise<void> {
  const card = getCharacterCard(characterId);
  const recent = getRecentMessages(characterId, SUGGESTIONS.sceneTurns)
    .map((entry) => ({
      role: entry.role,
      content: forHistory(entry.role, entry.content, entry.imageCaption),
    }))
    .filter((entry) => entry.content.trim().length > 0);

  const suggestions =
    recent.length > 0
      ? await generateReplySuggestions(
          recent,
          { characterName: card.name, tier: card.tier },
          signal,
        )
      : fallbackSuggestions();

  sendServerMessage(ws, { type: "reply_suggestions", payload: { suggestions } });
}
