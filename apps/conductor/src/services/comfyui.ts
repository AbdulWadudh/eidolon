export const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

export interface QueuePromptResponse {
  prompt_id: string;
  number?: number;
  node_errors?: Record<string, unknown>;
}

/**
 * Checks if the ComfyUI instance is alive and responsive.
 */
export async function checkComfyHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${COMFYUI_URL}/system_stats`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Queues an image generation workflow on ComfyUI.
 * Falls back to a mock prompt ID if ComfyUI is offline during development.
 */
export async function queueImageGeneration(
  prompt: string,
  characterFaceRef?: string,
): Promise<{ promptId: string }> {
  try {
    const workflowPayload = {
      prompt: {
        "3": {
          inputs: {
            seed: Math.floor(Math.random() * 1000000000),
            steps: 25,
            cfg: 7,
            sampler_name: "euler_ancestral",
            scheduler: "karras",
            denoise: 1,
            model: ["4", 0],
            positive: ["6", 0],
            negative: ["7", 0],
            latent_image: ["5", 0],
          },
          class_type: "KSampler",
        },
        "4": {
          inputs: { ckpt_name: "sd_xl_turbo_1.0_fp16.safetensors" },
          class_type: "CheckpointLoaderSimple",
        },
        "5": {
          inputs: { width: 768, height: 1344, batch_size: 1 },
          class_type: "EmptyLatentImage",
        },
        "6": {
          inputs: {
            text: `${prompt}, master quality, photorealistic, cinematic lighting${
              characterFaceRef ? `, face reference: ${characterFaceRef}` : ""
            }`,
            clip: ["4", 1],
          },
          class_type: "CLIPTextEncode",
        },
        "7": {
          inputs: {
            text: "blurry, low quality, distorted, bad anatomy",
            clip: ["4", 1],
          },
          class_type: "CLIPTextEncode",
        },
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${COMFYUI_URL}/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workflowPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`ComfyUI returned status ${res.status}`);
    }

    const data = (await res.json()) as QueuePromptResponse;
    return { promptId: data.prompt_id };
  } catch (error) {
    console.warn(
      `[ComfyUI Client] ComfyUI unreachable at ${COMFYUI_URL}: ${
        error instanceof Error ? error.message : String(error)
      }. Using mock prompt ID.`,
    );
    return { promptId: `mock-prompt-${crypto.randomUUID().slice(0, 8)}` };
  }
}
