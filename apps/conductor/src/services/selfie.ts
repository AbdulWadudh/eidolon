import { IMAGE, render } from "@eidolon/config";
import { sample } from "es-toolkit";
import { getCharacterAvatar, setCharacterAvatar } from "@/db";
import { getPrompt } from "@/prompts/store";
import type { Orientation } from "@/services/comfy-workflow";
import { generateImage, uploadFaceReference } from "@/services/comfyui";
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
      orientation: { type: "string", enum: ["portrait", "landscape"] },
      look_change: { type: "string" },
    },
    required: [
      "setting",
      "outfit",
      "others",
      "action",
      "light",
      "framing",
      "orientation",
      "look_change",
    ],
  },
} as const;

const faceNames = new Map<string, string>();

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

export async function paintSelfie(
  request: SelfieRequest,
  onQueued?: (promptId: string) => void,
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
  const image = await generateImage(promptUsed, faceName, orientation, onQueued, signal);
  const imageUrl = await uploadImage(
    request.characterId,
    `${crypto.randomUUID()}.png`,
    image.bytes,
  );

  return { imageUrl, promptUsed, orientation };
}

const WIDE_WORDS = new RegExp(`\\b(${IMAGE.wideWords.join("|")})\\b`, "i");

export function inferOrientation(text: string): Orientation {
  return WIDE_WORDS.test(text) ? "landscape" : "portrait";
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
