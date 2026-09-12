export const IMAGE_PRESETS = {
  sd15FaceId: {
    label: "CyberRealistic SD 1.5 + IPAdapter FaceID PlusV2",
    promptStyle: "tags",
    checkpoint: "cyberrealistic_final_pruned_fp16.safetensors",
    widthPx: 512,
    heightPx: 768,
    landscapeWidthPx: 768,
    landscapeHeightPx: 512,
    squarePx: 512,
    steps: 28,
    cfg: 6,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    vaeTileSize: 512,
    vaeTileOverlap: 64,
    hiresScale: 2,
    hiresSteps: 14,
    hiresDenoise: 0.45,
    hiresUpscaleMethod: "bislerp",
    face: {
      kind: "faceid",
      adapterPreset: "FACEID PLUS V2",
      loraStrength: 0.6,
      provider: "CPU",
      weight: 0.8,
      weightV2: 1,
      weightType: "linear",
      combineEmbeds: "concat",
      embedsScaling: "V only",
      startAt: 0,
      endAt: 1,
    },
  },
  sdxlPulid: {
    label: "RealVisXL V5 Lightning + PuLID",
    promptStyle: "tags",
    checkpoint: "RealVisXL_V5.0_Lightning_fp16.safetensors",
    widthPx: 832,
    heightPx: 1216,
    landscapeWidthPx: 1216,
    landscapeHeightPx: 832,
    squarePx: 1024,
    steps: 6,
    cfg: 2,
    sampler: "dpmpp_sde",
    scheduler: "karras",
    vaeTileSize: 512,
    vaeTileOverlap: 64,
    hiresScale: 1,
    hiresSteps: 6,
    hiresDenoise: 0.4,
    hiresUpscaleMethod: "nearest-exact",
    face: {
      kind: "pulid",
      model: "ip-adapter_pulid_sdxl_fp16.safetensors",
      provider: "CUDA",
      method: "fidelity",
      weight: 0.75,
      startAt: 0.12,
      endAt: 1,
    },
  },
} as const;

export type ImagePresetKey = keyof typeof IMAGE_PRESETS;
export type ImagePreset = (typeof IMAGE_PRESETS)[ImagePresetKey];

export const DEFAULT_IMAGE_PRESET: ImagePresetKey = "sdxlPulid";

export function isImagePresetKey(value: string): value is ImagePresetKey {
  return Object.hasOwn(IMAGE_PRESETS, value);
}

export const IMAGE = {
  sceneTurns: 6,
  lookFieldMaxWords: 4,
  sceneFieldMaxWords: 8,
  othersClauseWords: ["is", "are", "was", "were", "hanging", "sitting on", "lying on"],
  emptyWords: [
    "none",
    "nothing",
    "n/a",
    "na",
    "empty",
    "no one",
    "no-one",
    "nobody",
    "null",
    "undefined",
    "just me",
    "just her",
    "only her",
    "herself",
    "alone",
    "-",
  ],
  hairChangeWords: [
    "dyed",
    "dye",
    "bleached",
    "highlights",
    "bangs",
    "fringe",
    "buzzcut",
    "shaved",
    "braids",
    "haircut",
    "extensions",
  ],
  hairColourWords: [
    "red",
    "blonde",
    "blond",
    "brunette",
    "black",
    "brown",
    "pink",
    "blue",
    "green",
    "purple",
    "silver",
    "white",
    "ginger",
    "auburn",
    "platinum",
  ],
  bodyChangeWords: ["tan", "tanned", "sunburnt", "wet", "freckled", "glasses", "makeup"],
  ideaCount: 4,
  ideaMaxChars: 60,
  ideaMaxWords: 9,
  ideaOverlap: 0.6,
  ideaTemperature: 0.95,
  editDenoise: 0.62,
  framings: [
    "close selfie held at arm's length, looking into the lens",
    "selfie held high, looking up at the camera",
    "mirror selfie, phone visible in the reflection",
    "waist up, taken by someone else, not looking at the camera",
    "full length shot from a few steps away",
    "candid photo caught mid laugh, looking off to the side",
    "over the shoulder, glancing back at the camera",
    "three quarter view, head turned away from the lens",
    "sitting down, leaning on one hand, looking past the camera",
    "wide shot with her small in the frame and the place around her",
    "low angle from below, looking down at the lens",
    "cropped close on her face, half in shadow",
  ],
  flourishes: [
    "sunglasses pushed up into her hair",
    "wearing sunglasses",
    "hair tied up messily",
    "holding a drink",
    "one hand pushing her hair back",
    "mid sentence, mouth slightly open",
    "squinting into the sun",
    "wrapped in a coat against the cold",
    "peace sign, not taking it seriously",
    "looking down at something out of frame",
    "",
    "",
  ],
  wideWords: [
    "view",
    "views",
    "landscape",
    "scenery",
    "scenic",
    "sunset",
    "sunrise",
    "beach",
    "mountain",
    "mountains",
    "hike",
    "hiking",
    "skyline",
    "city",
    "street",
    "field",
    "lake",
    "river",
    "sea",
    "ocean",
    "valley",
    "forest",
    "road",
    "trip",
    "travel",
    "panorama",
    "horizon",
    "garden",
    "park",
  ],
  qualitySuffix:
    "photorealistic, natural skin texture, visible skin pores, subtle skin imperfections, sharp focus, shot on a phone camera",
  negativePrompt:
    "blurry, low quality, distorted, bad anatomy, deformed hands, mutated hands, malformed fingers, fused fingers, extra fingers, missing fingers, extra limbs, extra arms, disfigured, watermark, text, signature, cgi, 3d render, doll, airbrushed, waxy skin, plastic skin, smooth skin",
  appearanceFallback:
    "a woman in her late twenties, shoulder length dark hair, warm brown eyes, casual everyday clothes",
  captionMaxChars: 90,
  captionAttempts: 3,
  captionMinWords: 3,
  captionMaxWords: 14,
  captionMaxTokens: 72,
  captionTemperature: 1.0,
  captionPresencePenalty: 0.8,
  captionFrequencyPenalty: 0.6,
  promptMaxTokens: 480,
  promptMaxChars: 2000,
  appearanceTemperature: 0.4,
  sceneTemperature: 0.7,
  pollIntervalMs: 750,
  maxPollMs: 180000,
} as const;

export const PROMPT_STYLES = {
  tags: {
    label: "comma separated keywords, for CLIP text encoders (SD 1.5, SDXL)",
    separator: ", ",
    qualitySuffix: IMAGE.qualitySuffix,
    negativePrompt: IMAGE.negativePrompt,
    writerBrief: "Reply with one line of comma separated visual phrases and nothing else.",
  },
} as const;

export type PromptStyleKey = keyof typeof PROMPT_STYLES;

export function promptStyleFor(preset: ImagePreset) {
  return PROMPT_STYLES[preset.promptStyle];
}

export function composePrompt(preset: ImagePreset, body: string): string {
  const style = promptStyleFor(preset);
  const trimmed = body.trim();
  if (trimmed.length === 0) return style.qualitySuffix;
  return `${trimmed}${style.separator}${style.qualitySuffix}`;
}

export function negativePromptFor(preset: ImagePreset): string {
  return promptStyleFor(preset).negativePrompt;
}
