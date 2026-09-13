import { REPLY_VARIANTS } from "@/config";
import { getCharacter } from "@/db/characters";
import { assemblePrompt } from "@/orchestrator/prompt-builder";
import { exampleLines } from "@/services/self-reference";
import type { WebSocketSender } from "@/ws/protocol";
import { streamReply } from "@/ws/reply-stream";

const SILENT: WebSocketSender = { send: () => {} };

export interface VariantRequest {
  characterId: string;
  userText: string;
  allowSearch: boolean;
  mood?: string | undefined;
  avoid: string;
  signal: AbortSignal;
}

function distinct(texts: string[], avoid: string): string[] {
  const seen = new Set([avoid.trim().toLowerCase()]);
  const kept: string[] = [];

  for (const text of texts) {
    const line = text.trim();
    const key = line.toLowerCase();
    if (line.length === 0 || seen.has(key)) continue;
    seen.add(key);
    kept.push(line);
  }

  return kept;
}

export async function generateReplyVariants(request: VariantRequest): Promise<string[]> {
  const assembled = await assemblePrompt({
    characterId: request.characterId,
    userText: request.userText,
    allowSearch: request.allowSearch,
    moodOverride: request.mood,
  });

  if (request.signal.aborted) return [];

  const card = getCharacter(request.characterId);
  const said = exampleLines(card?.exampleDialogue ?? "", assembled.characterName);

  const drafts: string[] = [];
  for (let attempt = 0; attempt < REPLY_VARIANTS.count; attempt += 1) {
    if (request.signal.aborted) break;

    const outcome = await streamReply(
      SILENT,
      assembled.messages,
      request.signal,
      [...said, ...drafts, request.avoid],
      assembled.characterName,
    );

    const line = outcome.reply.trim();
    if (line.length > 0) drafts.push(line);
  }

  return distinct(drafts, request.avoid).slice(0, REPLY_VARIANTS.count);
}
