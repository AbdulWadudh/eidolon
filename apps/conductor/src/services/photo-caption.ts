import { IMAGE, render } from "@eidolon/config";
import { getPrompt } from "@/prompts/store";
import { askInVoice } from "@/services/prompt-writer";

export interface CaptionRequest {
  name: string;
  personality: string;
}

// A small roleplay model asked for a photo caption will often answer as the
// person receiving it, narrate the frame, or hand back the planner's own
// bracketed notes. None of that is worth showing, and a photo with no caption
// is perfectly ordinary — so anything that fails these checks is dropped.
const NOT_A_CAPTION = [
  /[[\]{}*]/,
  /^(the |this |that |here('s| is) )?(a |an |my |our )?(photo|picture|image|pic|shot|snap)\b/i,
  /\b(is |are )?attached\b/i,
  /\b(you sent|you send|why did you|what am i supposed|wish you were here)\b/i,
  /\bsends? a photo\b/i,
  /\b(here (is|are)|i might send|a message i|caption)\b/i,
];

export function usableCaption(line: string, name: string): boolean {
  const words = line.split(/\s+/).filter((word) => /[a-z]/i.test(word));
  if (words.length < IMAGE.captionMinWords || words.length > IMAGE.captionMaxWords) return false;
  if (new RegExp(`\\b${name}\\b`, "i").test(line)) return false;
  return !NOT_A_CAPTION.some((pattern) => pattern.test(line));
}

// The reply is a paragraph that the token budget cuts off partway through, so
// judging it line by line meant judging a mangled tail — a caption was thrown
// away for words the model never finished writing. Whole sentences are taken
// instead, up to the word budget, and a truncated last one is dropped.
export function firstCaption(raw: string, maxWords: number): string {
  const text = raw
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length === 0) return "";

  const sentences = text.split(/(?<=[.!?…])\s+/);
  const kept: string[] = [];
  let words = 0;

  for (const sentence of sentences) {
    const finished = /[.!?…]$/.test(sentence);
    if (!finished && kept.length > 0) break;

    const count = sentence.split(/\s+/).length;
    if (kept.length > 0 && words + count > maxWords) break;

    kept.push(sentence);
    words += count;
    if (words >= maxWords) break;
  }

  return kept.join(" ").trim();
}

function shorten(line: string, limit: number): string {
  if (line.length <= limit) return line;
  const cut = line.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, "")}…`;
}

// A small roleplay model gets this right well under half the time — it
// monologues, answers as the person receiving the photo, or narrates the frame.
// Asking again costs a few dozen tokens and turns a coin flip into a good bet.
// A photo with no caption is still an ordinary thing to send if every attempt
// comes back unusable.
export async function captionLine(
  request: CaptionRequest,
  subject: string,
  signal?: AbortSignal,
): Promise<string> {
  const prompt = render(getPrompt("image.caption"), {
    name: request.name,
    personality: request.personality,
    subject,
  });

  for (let attempt = 0; attempt < IMAGE.captionAttempts; attempt += 1) {
    if (signal?.aborted) return "";

    const candidate = firstCaption(await askInVoice(prompt, signal), IMAGE.captionMaxWords);
    if (usableCaption(candidate, request.name)) {
      return shorten(candidate, IMAGE.captionMaxChars);
    }
  }

  return "";
}
