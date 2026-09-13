import { composePrompt, IMAGE_PRESETS, type ImagePreset, negativePromptFor } from "@eidolon/config";
import { getImagePreset } from "@eidolon/config/server";
import { IMAGE } from "@/config";

export type Orientation = "portrait" | "landscape" | "square";

export interface WorkflowRequest {
  prompt: string;
  seed: number;
  faceImageName: string | null;
  orientation: Orientation;
  sourceImageName?: string | null;
  preset?: ImagePreset;
}

export function activePreset(): ImagePreset {
  return IMAGE_PRESETS[getImagePreset()];
}

export function dimensionsFor(
  orientation: Orientation,
  preset: ImagePreset = activePreset(),
): { width: number; height: number } {
  if (orientation === "landscape") {
    return { width: preset.landscapeWidthPx, height: preset.landscapeHeightPx };
  }
  if (orientation === "square") {
    return { width: preset.squarePx, height: preset.squarePx };
  }
  return { width: preset.widthPx, height: preset.heightPx };
}

type Node = { inputs: Record<string, unknown>; class_type: string };
type Graph = Record<string, Node>;

const CHECKPOINT = "1";
const POSITIVE = "2";
const NEGATIVE = "3";
const LATENT = "4";
const SAMPLER = "5";
const DECODE = "6";
const SAVE = "7";
const FACE_IMAGE = "8";
const SOURCE_IMAGE = "9";
const SOURCE_LATENT = "10";
const FACE_A = "11";
const FACE_B = "12";
const FACE_C = "13";
const APPLY_FACE = "14";
const HIRES_UPSCALE = "15";
const HIRES_SAMPLER = "16";

function useModel(graph: Graph, model: [string, number]): void {
  for (const id of [SAMPLER, HIRES_SAMPLER]) {
    if (graph[id]) graph[id].inputs.model = model;
  }
}

export function buildImageWorkflow(request: WorkflowRequest): Graph {
  const preset = request.preset ?? activePreset();
  const size = dimensionsFor(request.orientation, preset);

  const modelSrc: [string, number] = [CHECKPOINT, 0];
  const clipSrc: [string, number] = [CHECKPOINT, 1];
  const vaeSrc: [string, number] = [CHECKPOINT, 2];

  const graph: Graph = {
    [CHECKPOINT]: {
      inputs: { ckpt_name: preset.checkpoint },
      class_type: "CheckpointLoaderSimple",
    },
    [POSITIVE]: {
      inputs: {
        text: composePrompt(preset, request.prompt),
        clip: clipSrc,
      },
      class_type: "CLIPTextEncode",
    },
    [NEGATIVE]: {
      inputs: { text: negativePromptFor(preset), clip: clipSrc },
      class_type: "CLIPTextEncode",
    },
    [LATENT]: {
      inputs: { width: size.width, height: size.height, batch_size: 1 },
      class_type: "EmptyLatentImage",
    },
    [SAMPLER]: {
      inputs: {
        seed: request.seed,
        steps: preset.steps,
        cfg: preset.cfg,
        sampler_name: preset.sampler,
        scheduler: preset.scheduler,
        denoise: 1,
        model: modelSrc,
        positive: [POSITIVE, 0],
        negative: [NEGATIVE, 0],
        latent_image: [LATENT, 0],
      },
      class_type: "KSampler",
    },
    [DECODE]: {
      inputs: {
        samples: [SAMPLER, 0],
        vae: vaeSrc,
        tile_size: preset.vaeTileSize,
        overlap: preset.vaeTileOverlap,
        temporal_size: 64,
        temporal_overlap: 8,
      },
      class_type: "VAEDecodeTiled",
    },
    [SAVE]: {
      inputs: { filename_prefix: "eidolon", images: [DECODE, 0] },
      class_type: "SaveImage",
    },
  };

  if (preset.hiresScale > 1) {
    graph[HIRES_UPSCALE] = {
      inputs: {
        samples: [SAMPLER, 0],
        upscale_method: preset.hiresUpscaleMethod,
        width: Math.round((size.width * preset.hiresScale) / 8) * 8,
        height: Math.round((size.height * preset.hiresScale) / 8) * 8,
        crop: "disabled",
      },
      class_type: "LatentUpscale",
    };
    graph[HIRES_SAMPLER] = {
      inputs: {
        seed: request.seed,
        steps: preset.hiresSteps,
        cfg: preset.cfg,
        sampler_name: preset.sampler,
        scheduler: preset.scheduler,
        denoise: preset.hiresDenoise,
        model: modelSrc,
        positive: [POSITIVE, 0],
        negative: [NEGATIVE, 0],
        latent_image: [HIRES_UPSCALE, 0],
      },
      class_type: "KSampler",
    };
    graph[DECODE].inputs.samples = [HIRES_SAMPLER, 0];
  }

  if (request.sourceImageName) {
    graph[SOURCE_IMAGE] = {
      inputs: { image: request.sourceImageName },
      class_type: "LoadImage",
    };
    graph[SOURCE_LATENT] = {
      inputs: { pixels: [SOURCE_IMAGE, 0], vae: vaeSrc },
      class_type: "VAEEncode",
    };
    graph[SAMPLER].inputs.latent_image = [SOURCE_LATENT, 0];
    graph[SAMPLER].inputs.denoise = IMAGE.editDenoise;
  }

  if (!request.faceImageName) return graph;

  graph[FACE_IMAGE] = {
    inputs: { image: request.faceImageName },
    class_type: "LoadImage",
  };

  if (preset.face.kind === "pulid") {
    graph[FACE_A] = {
      inputs: { pulid_file: preset.face.model },
      class_type: "PulidModelLoader",
    };
    graph[FACE_B] = {
      inputs: { provider: preset.face.provider },
      class_type: "PulidInsightFaceLoader",
    };
    graph[FACE_C] = { inputs: {}, class_type: "PulidEvaClipLoader" };
    graph[APPLY_FACE] = {
      inputs: {
        model: modelSrc,
        pulid: [FACE_A, 0],
        eva_clip: [FACE_C, 0],
        face_analysis: [FACE_B, 0],
        image: [FACE_IMAGE, 0],
        method: preset.face.method,
        weight: preset.face.weight,
        start_at: preset.face.startAt,
        end_at: preset.face.endAt,
      },
      class_type: "ApplyPulid",
    };
    useModel(graph, [APPLY_FACE, 0]);
    return graph;
  }

  graph[FACE_A] = {
    inputs: {
      model: modelSrc,
      preset: preset.face.adapterPreset,
      lora_strength: preset.face.loraStrength,
      provider: preset.face.provider,
    },
    class_type: "IPAdapterUnifiedLoaderFaceID",
  };
  graph[APPLY_FACE] = {
    inputs: {
      model: [FACE_A, 0],
      ipadapter: [FACE_A, 1],
      image: [FACE_IMAGE, 0],
      weight: preset.face.weight,
      weight_faceidv2: preset.face.weightV2,
      weight_type: preset.face.weightType,
      combine_embeds: preset.face.combineEmbeds,
      start_at: preset.face.startAt,
      end_at: preset.face.endAt,
      embeds_scaling: preset.face.embedsScaling,
    },
    class_type: "IPAdapterFaceID",
  };
  useModel(graph, [APPLY_FACE, 0]);

  return graph;
}
