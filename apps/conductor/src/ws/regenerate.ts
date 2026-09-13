import { CHAT_COPY } from "@eidolon/config";
import type { RegenerateReplyEvent, ReplyVariantsEvent } from "@eidolon/protocol";
import { lastExchange } from "@/db";
import { generateReplyVariants } from "@/services/reply-variants";
import { handleChatTurn } from "@/ws/chat-turn";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

function nothingToRedo(ws: WebSocketSender): void {
  sendServerMessage(ws, {
    type: "error",
    payload: { code: "NOTHING_TO_REDO", message: CHAT_COPY.nothingToRegenerate },
  });
}

export async function handleReplyVariants(
  ws: WebSocketSender,
  userId: string,
  event: ReplyVariantsEvent,
  signal: AbortSignal,
): Promise<void> {
  const previous = lastExchange(event.character_id, userId);
  if (!previous) {
    nothingToRedo(ws);
    return;
  }

  const options = await generateReplyVariants({
    characterId: event.character_id,
    userId,
    userText: previous.userText,
    allowSearch: event.allow_search,
    mood: event.mood,
    avoid: previous.assistantText,
    signal,
  });

  if (signal.aborted) return;

  if (options.length === 0) {
    nothingToRedo(ws);
    return;
  }

  sendServerMessage(ws, {
    type: "reply_options",
    payload: { message_id: previous.assistantId, options },
  });
}

export async function handleRegenerateReply(
  ws: WebSocketSender,
  userId: string,
  event: RegenerateReplyEvent,
  signal: AbortSignal,
): Promise<void> {
  const previous = lastExchange(event.character_id, userId);
  if (!previous) {
    nothingToRedo(ws);
    return;
  }

  await handleChatTurn(
    ws,
    userId,
    {
      type: "chat_turn",
      character_id: event.character_id,
      text: previous.userText,
      allow_search: event.allow_search,
      user_timezone: event.user_timezone,
      live_voice: false,
      mood: event.mood,
    },
    signal,
    { recordUserTurn: false },
  );
}
