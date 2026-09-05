import { IMAGE } from "@eidolon/config";

export type Orientation = "portrait" | "landscape" | "square";

export interface WorkflowRequest {
  prompt: string;
  seed: number;
  faceImageName: string | null;
  orientation: Orientation;
}

export function dimensionsFor(orientation: Orientation): { width: number; height: number } {
  if (orientation === "landscape") {
    return { width: IMAGE.landscapeWidthPx, height: IMAGE.landscapeHeightPx };
  }
  if (orientation === "square") {
    return { width: IMAGE.squarePx, height: IMAGE.squarePx };
  }
  return { width: IMAGE.widthPx, height: IMAGE.heightPx };
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
const PULID_MODEL = "8";
const INSIGHT_FACE = "9";
const EVA_CLIP = "10";
const FACE_IMAGE = "11";
const APPLY_PULID = "12";

export function buildImageWorkflow(request: WorkflowRequest): Graph {
  const size = dimensionsFor(request.orientation);
  const graph: Graph = {
    [CHECKPOINT]: {
      inputs: { ckpt_name: IMAGE.checkpoint },
      class_type: "CheckpointLoaderSimple",
    },
    [POSITIVE]: {
      inputs: {
        text: `${request.prompt}, ${IMAGE.qualitySuffix}`,
        clip: [CHECKPOINT, 1],
      },
      class_type: "CLIPTextEncode",
    },
    [NEGATIVE]: {
      inputs: { text: IMAGE.negativePrompt, clip: [CHECKPOINT, 1] },
      class_type: "CLIPTextEncode",
    },
    [LATENT]: {
      inputs: { width: size.width, height: size.height, batch_size: 1 },
      class_type: "EmptyLatentImage",
    },
    [SAMPLER]: {
      inputs: {
        seed: request.seed,
        steps: IMAGE.steps,
        cfg: IMAGE.cfg,
        sampler_name: IMAGE.sampler,
        scheduler: IMAGE.scheduler,
        denoise: 1,
        model: [CHECKPOINT, 0],
        positive: [POSITIVE, 0],
        negative: [NEGATIVE, 0],
        latent_image: [LATENT, 0],
      },
      class_type: "KSampler",
    },
    [DECODE]: {
      inputs: { samples: [SAMPLER, 0], vae: [CHECKPOINT, 2] },
      class_type: "VAEDecode",
    },
    [SAVE]: {
      inputs: { filename_prefix: "eidolon", images: [DECODE, 0] },
      class_type: "SaveImage",
    },
  };

  if (!request.faceImageName) return graph;

  graph[PULID_MODEL] = {
    inputs: { pulid_file: IMAGE.pulidModel },
    class_type: "PulidModelLoader",
  };
  graph[INSIGHT_FACE] = {
    inputs: { provider: IMAGE.insightFaceProvider },
    class_type: "PulidInsightFaceLoader",
  };
  graph[EVA_CLIP] = { inputs: {}, class_type: "PulidEvaClipLoader" };
  graph[FACE_IMAGE] = {
    inputs: { image: request.faceImageName },
    class_type: "LoadImage",
  };
  graph[APPLY_PULID] = {
    inputs: {
      model: [CHECKPOINT, 0],
      pulid: [PULID_MODEL, 0],
      eva_clip: [EVA_CLIP, 0],
      face_analysis: [INSIGHT_FACE, 0],
      image: [FACE_IMAGE, 0],
      method: IMAGE.pulidMethod,
      weight: IMAGE.pulidWeight,
      start_at: IMAGE.pulidStartAt,
      end_at: IMAGE.pulidEndAt,
    },
    class_type: "ApplyPulid",
  };
  graph[SAMPLER].inputs.model = [APPLY_PULID, 0];

  return graph;
}
