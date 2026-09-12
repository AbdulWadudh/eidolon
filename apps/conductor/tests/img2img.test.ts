import { describe, expect, it } from "bun:test";
import { IMAGE, IMAGE_PRESETS } from "@eidolon/config";
import { buildImageWorkflow } from "@/services/comfy-workflow";

const base = { prompt: "a woman in a kitchen", seed: 1, orientation: "portrait" as const };

describe("editing a photo rather than making one", () => {
  it("starts from noise when there is no source", () => {
    const graph = buildImageWorkflow({ ...base, faceImageName: null });
    const sampler = Object.values(graph).find((node) => node.class_type === "KSampler");

    expect(sampler?.inputs.denoise).toBe(1);
    expect(Object.values(graph).some((n) => n.class_type === "VAEEncode")).toBe(false);
  });

  it("encodes the source and keeps part of it", () => {
    const graph = buildImageWorkflow({
      ...base,
      faceImageName: null,
      sourceImageName: "emma-source.png",
    });

    const encode = Object.values(graph).find((node) => node.class_type === "VAEEncode");
    const sampler = Object.values(graph).find((node) => node.class_type === "KSampler");

    expect(encode).toBeDefined();
    expect(sampler?.inputs.denoise).toBe(IMAGE.editDenoise);
    expect(IMAGE.editDenoise).toBeLessThan(1);
  });

  it("samples from the encoded photo, not an empty latent", () => {
    const graph = buildImageWorkflow({
      ...base,
      faceImageName: null,
      sourceImageName: "emma-source.png",
    });

    const sampler = Object.values(graph).find((node) => node.class_type === "KSampler");
    expect(sampler).toBeDefined();
    const latentNode = (sampler?.inputs.latent_image as [string, number])?.[0];

    expect(graph[latentNode].class_type).toBe("VAEEncode");
  });

  const APPLIES_FACE = { sdxlPulid: "ApplyPulid", sd15FaceId: "IPAdapterFaceID" } as const;

  for (const [name, applyNode] of Object.entries(APPLIES_FACE)) {
    it(`still applies the face when editing on ${name}`, () => {
      const graph = buildImageWorkflow({
        ...base,
        preset: IMAGE_PRESETS[name as keyof typeof IMAGE_PRESETS],
        faceImageName: "emma-face.png",
        sourceImageName: "emma-source.png",
      });

      expect(Object.values(graph).some((n) => n.class_type === applyNode)).toBe(true);
      expect(Object.values(graph).some((n) => n.class_type === "VAEEncode")).toBe(true);

      const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
      const modelNode = (sampler?.inputs.model as [string, number])?.[0];
      expect(graph[modelNode].class_type).toBe(applyNode);
    });
  }

  it("never decodes untiled, whichever stack is driving", () => {
    for (const preset of Object.values(IMAGE_PRESETS)) {
      const graph = buildImageWorkflow({ ...base, preset, faceImageName: null });
      expect(Object.values(graph).some((n) => n.class_type === "VAEDecode")).toBe(false);
      expect(Object.values(graph).some((n) => n.class_type === "VAEDecodeTiled")).toBe(true);
    }
  });
});
