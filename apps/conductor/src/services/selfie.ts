import { IMAGE, render } from "@eidolon/config";
import {
  getCharacterAppearance,
  getCharacterAvatar,
  setCharacterAppearance,
  setCharacterAvatar,
} from "@/db";
import { getPrompt } from "@/prompts/store";
import { generateImage, uploadFaceReference } from "@/services/comfyui";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { uploadImage } from "@/services/storage";

export interface SelfieRequest {
  characterId: string;
  name: string;
  personality: string;
  scene: string;
  request: string;
}

export interface Selfie {
  imageUrl: string;
  promptUsed: string;
}

const faceNames = new Map<string, string>();
const appearances = new Map<string, string>();

const PROMPT_WRITER_SYSTEM =
  "You write prompts for an image generator. You are not a character and you never speak as one. You never use asterisks, quotation marks, questions or first person. You reply with one line of comma separated visual phrases and nothing else.";

const NOT_A_PROMPT = /[*?"]|(^|\s)(i|i'm|my|me|you|your|we)(\s|$)/i;

export function isPromptLike(text: string): boolean {
  return text.length > 0 && !NOT_A_PROMPT.test(text);
}

async function askForOneLine(
  prompt: string,
  temperature: number,
  signal?: AbortSignal,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPT_WRITER_SYSTEM },
    { role: "user", content: prompt },
  ];
  let raw = "";
  for await (const token of streamChatCompletion(messages, signal, {
    temperature,
    maxTokens: IMAGE.promptMaxTokens,
    allowMockFallback: false,
  })) {
    raw += token;
    if (raw.length > IMAGE.promptMaxChars) break;
  }
  return oneLine(raw);
}

function oneLine(text: string): string {
  return text
    .replace(/[\r\n]+/g, ", ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function describeAppearance(request: SelfieRequest, signal?: AbortSignal): Promise<string> {
  const cached =
    appearances.get(request.characterId) ?? getCharacterAppearance(request.characterId);
  if (cached) {
    appearances.set(request.characterId, cached);
    return cached;
  }

  const prompt = render(getPrompt("image.appearance"), {
    name: request.name,
    personality: request.personality,
  });
  const described = await askForOneLine(prompt, IMAGE.appearanceTemperature, signal);
  const usable = isPromptLike(described) ? described : IMAGE.appearanceFallback;
  appearances.set(request.characterId, usable);
  setCharacterAppearance(request.characterId, usable);
  return usable;
}

async function ensureFaceReference(request: SelfieRequest, appearance: string): Promise<string> {
  const cached = faceNames.get(request.characterId);
  if (cached) return cached;

  const stored = getCharacterAvatar(request.characterId);
  const bytes = stored
    ? new Uint8Array(await (await fetch(stored)).arrayBuffer())
    : (await generateImage(`${appearance}, head and shoulders portrait, neutral expression`, null))
        .bytes;

  if (!stored) {
    const url = await uploadImage(request.characterId, "face.png", bytes);
    setCharacterAvatar(request.characterId, url);
  }

  const name = await uploadFaceReference(bytes, `${request.characterId}-face.png`);
  faceNames.set(request.characterId, name);
  return name;
}

export async function paintSelfie(
  request: SelfieRequest,
  onQueued?: (promptId: string) => void,
  signal?: AbortSignal,
): Promise<Selfie> {
  const appearance = await describeAppearance(request, signal);
  const faceName = await ensureFaceReference(request, appearance);

  const scenePrompt = await askForOneLine(
    render(getPrompt("image.scene"), {
      name: request.name,
      appearance,
      scene: request.scene,
      request: request.request,
    }),
    IMAGE.sceneTemperature,
    signal,
  );

  const scene = isPromptLike(scenePrompt) ? scenePrompt : request.request;
  const promptUsed = `${appearance}, ${scene}`;
  const image = await generateImage(promptUsed, faceName, onQueued, signal);
  const imageUrl = await uploadImage(
    request.characterId,
    `${crypto.randomUUID()}.png`,
    image.bytes,
  );

  return { imageUrl, promptUsed };
}

export function forgetFace(characterId: string): void {
  faceNames.delete(characterId);
  appearances.delete(characterId);
}

export const SELFIE_ASPECT: "9:16" | "1:1" = IMAGE.widthPx < IMAGE.heightPx ? "9:16" : "1:1";
