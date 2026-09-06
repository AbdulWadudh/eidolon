import { PROACTIVE, QUEUE_CONCURRENCY, QUEUE_NAMES, QUEUE_PREFIXES, render } from "@eidolon/config";
import { Worker } from "bullmq";
import { appendMessage, getCharacterCard } from "@/db";
import { getPrompt } from "@/prompts/store";
import { queueConnection } from "@/queue/connection";
import type { ProactiveJob, ProactiveJobData, ProactiveJobName } from "@/queue/types";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { limitActions } from "@/services/stage-directions";
import { broadcastToCharacter } from "@/ws/registry";

export function shapeOpener(raw: string): string {
  const collapsed = limitActions(raw.replace(/\s+/g, " ").trim());
  return collapsed.length > PROACTIVE.maxChars
    ? collapsed.slice(0, PROACTIVE.maxChars).trimEnd()
    : collapsed;
}

export async function processProactiveJob(job: ProactiveJob): Promise<void> {
  const { characterId, contextPrompt } = job.data;
  const card = getCharacterCard(characterId);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: render(getPrompt("proactive.system"), {
        name: card.name,
        mood: card.mood,
        tier: card.tier,
        maxChars: PROACTIVE.maxChars,
      }),
    },
    {
      role: "user",
      content: render(getPrompt("proactive.user"), { context: contextPrompt }),
    },
  ];

  let raw = "";
  for await (const token of streamChatCompletion(messages, undefined, {
    temperature: PROACTIVE.temperature,
    maxTokens: PROACTIVE.maxTokens,
    allowMockFallback: false,
  })) {
    raw += token;
    if (raw.length > PROACTIVE.maxChars * 2) break;
  }

  const opener = shapeOpener(raw);
  if (opener.length === 0) {
    throw new Error("The model produced no spontaneous message worth sending.");
  }

  appendMessage(characterId, "assistant", opener);

  const delivered = broadcastToCharacter(characterId, {
    type: "text_replace",
    payload: { text: opener },
  });

  if (delivered === 0) {
    console.log(
      `[queue:proactive] ${card.name} spoke to nobody; the line waits in the transcript.`,
    );
  }
}

export function createProactiveWorker(): Worker<ProactiveJobData, void, ProactiveJobName> {
  const worker = new Worker<ProactiveJobData, void, ProactiveJobName>(
    QUEUE_NAMES.proactive,
    processProactiveJob,
    {
      connection: queueConnection(),
      prefix: QUEUE_PREFIXES.proactive,
      concurrency: QUEUE_CONCURRENCY.proactive,
    },
  );

  worker.on("failed", (job, error) => {
    console.error(`[queue:proactive] ${job?.id ?? "job"} failed: ${error.message}`);
  });

  return worker;
}
