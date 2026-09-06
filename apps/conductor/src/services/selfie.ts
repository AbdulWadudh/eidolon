import { IMAGE, render, TIMEOUTS_MS } from "@eidolon/config";
import { sample } from "es-toolkit";
import { getCharacterAvatar, getCharacterLook, setCharacterAvatar } from "@/db/look";

import { getPrompt } from "@/prompts/store";
import type { Orientation } from "@/services/comfy-workflow";
import { generateImage, uploadFaceReference } from "@/services/comfyui";
import { captionLine } from "@/services/photo-caption";
import { composeAppearance, describeAppearance, forgetLook, oneLine } from "@/services/photo-look";
import { ask } from "@/services/prompt-writer";
import { uploadImage } from "@/services/storage";
import { safeJsonParse } from "@/utils/json";
export interface SelfieRequest {
  characterId: string;
  name: string;
  personality: string;
  scene: string;
  request: string;
  orientation?: Orientation;
}

export interface Selfie {
  imageUrl: string;
  promptUsed: string;
  orientation: Orientation;
  caption: string;
  message: string;
}

interface Shot {
  setting: string;
  outfit: string;
  others: string;
  action: string;
  light: string;
  framing: string;
  orientation: "portrait" | "landscape";
  look_change: string;
}

const SHOT_SCHEMA = {
  name: "photo",
  schema: {
    type: "object",
    properties: {
      setting: { type: "string" },
      outfit: { type: "string" },
      others: { type: "string" },
      action: { type: "string" },
      light: { type: "string" },
      framing: { type: "string" },
      look_change: { type: "string" },
      orientation: { type: "string", enum: ["portrait", "landscape"] },
    },
    required: [
      "setting",
      "outfit",
      "others",
      "action",
      "light",
      "framing",
      "look_change",
      "orientation",
    ],
  },
} as const;

const faceNames = new Map<string, string>();

// A stored avatar can point anywhere — storage may be down, or the reader may
// have set one from a photo that has since been deleted. Falling back to a
// fresh portrait keeps one bad URL from breaking every photo from then on.
async function readStoredFace(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest) });
    if (!response.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.warn(`[selfie] stored face unreadable at ${url}:`, error);
    return null;
  }
}

async function ensureFaceReference(request: SelfieRequest, appearance: string): Promise<string> {
  const cached = faceNames.get(request.characterId);
  if (cached) return cached;

  // A face chosen by the reader wins over the avatar: the profile picture is
  // whatever looks good small, which is not always the clearest look at a face.
  const stored =
    getCharacterLook(request.characterId).faceUrl ?? getCharacterAvatar(request.characterId);
  const existing = stored ? await readStoredFace(stored) : null;

  const bytes =
    existing ??
    (await generateImage(`${appearance}, head and shoulders portrait, neutral expression`, null))
      .bytes;

  if (!existing) {
    const url = await uploadImage(request.characterId, "face.png", bytes);
    setCharacterAvatar(request.characterId, url);
  }

  const name = await uploadFaceReference(bytes, `${request.characterId}-face.png`);
  faceNames.set(request.characterId, name);
  return name;
}

async function composeShot(request: SelfieRequest, signal?: AbortSignal): Promise<Shot | null> {
  const raw = await ask(
    render(getPrompt("image.scene"), {
      name: request.name,
      scene: request.scene,
      request: request.request,
      framings: IMAGE.framings.join("; "),
    }),
    IMAGE.sceneTemperature,
    signal,
    SHOT_SCHEMA,
  );

  const parsed = safeJsonParse<Partial<Shot> | null>(raw, null);
  if (!parsed || typeof parsed !== "object") return null;

  return {
    setting: oneLine(parsed.setting ?? ""),
    outfit: oneLine(parsed.outfit ?? ""),
    others: oneLine(parsed.others ?? ""),
    action: oneLine(parsed.action ?? ""),
    light: oneLine(parsed.light ?? ""),
    framing: oneLine(parsed.framing ?? "") || sample(IMAGE.framings),
    orientation: parsed.orientation === "landscape" ? "landscape" : "portrait",
    look_change: oneLine(parsed.look_change ?? ""),
  };
}

export interface PaintHooks {
  onProgress?: (progress: { value: number; max: number }) => void;
  onPreview?: (dataUri: string) => void;
}

export async function paintSelfie(
  request: SelfieRequest,
  hooks: PaintHooks = {},
  signal?: AbortSignal,
): Promise<Selfie> {
  const look = await describeAppearance(request, signal);
  const faceName = await ensureFaceReference(request, composeAppearance(look, ""));
  const shot = await composeShot(request, signal);
  const appearance = composeAppearance(look, shot?.look_change ?? "");

  const orientation =
    request.orientation ??
    shot?.orientation ??
    inferOrientation(`${request.request} ${shot?.setting ?? ""}`);

  const parts = shot
    ? [
        appearance,
        shot.outfit,
        shot.others,
        shot.action,
        shot.setting,
        shot.light,
        shot.framing,
        IMAGE.qualitySuffix,
      ]
    : [
        appearance,
        request.request,
        sample(IMAGE.framings),
        sample(IMAGE.flourishes),
        IMAGE.qualitySuffix,
      ];

  const promptUsed = parts
    .map(oneLine)
    .filter((part) => part.length > 0)
    .join(", ");
  const subject = captionFor(shot, request.request);

  // The caption only needs the subject, which is known before the first step is
  // sampled. Asking for it afterwards left the card sitting at 6 of 6 through
  // three language model calls with the picture already finished behind it.
  const [image, message] = await Promise.all([
    generateImage(promptUsed, faceName, {
      orientation,
      onProgress: hooks.onProgress,
      onPreview: hooks.onPreview,
      signal,
    }),
    captionLine(request, subject, signal),
  ]);
  const imageUrl = await uploadImage(
    request.characterId,
    `${crypto.randomUUID()}.png`,
    image.bytes,
  );

  return {
    imageUrl,
    promptUsed,
    orientation,
    caption: subject,
    message,
  };
}

const WIDE_WORDS = new RegExp(`\\b(${IMAGE.wideWords.join("|")})\\b`, "i");

export function inferOrientation(text: string): Orientation {
  return WIDE_WORDS.test(text) ? "landscape" : "portrait";
}

function captionFor(shot: Shot | null, request: string): string {
  if (!shot) return oneLine(request);

  const withWhom = shot.others.length > 0 ? ` with ${shot.others}` : "";
  const doing = shot.action.length > 0 ? `, ${shot.action}` : "";
  const place = shot.setting.length > 0 ? ` at ${shot.setting}` : "";
  return oneLine(`${withWhom}${place}${doing}`.replace(/^,\s*/, "")) || oneLine(request);
}

export function forgetFace(characterId: string): void {
  faceNames.delete(characterId);
  forgetLook(characterId);
}

export const ASPECT_FOR: Record<Orientation, "9:16" | "1:1" | "16:9"> = {
  portrait: "9:16",
  landscape: "16:9",
  square: "1:1",
};
