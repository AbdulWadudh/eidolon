import { describe, expect, it } from "bun:test";
import sharp from "sharp";
import { asWebpName, toStoredImage } from "@/services/storage";

async function noisyPng(width = 512, height = 768): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 2654435761) % 251;
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

describe("what actually gets stored", () => {
  it("turns ComfyUI's PNG into a real WebP", async () => {
    const stored = await toStoredImage(await noisyPng());

    expect(stored.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(stored.subarray(8, 12).toString("ascii")).toBe("WEBP");
    expect((await sharp(stored).metadata()).format).toBe("webp");
  });

  it("keeps the picture whole, at the size it came in", async () => {
    const png = await noisyPng();
    const stored = await toStoredImage(png);
    const before = await sharp(png).metadata();
    const after = await sharp(stored).metadata();

    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
  });

  it("does not compress a WebP a second time", async () => {
    const once = await toStoredImage(await noisyPng());
    const twice = await toStoredImage(once);

    expect(twice.length).toBe(once.length);
  });

  it("stores a file it cannot read rather than losing it", async () => {
    const junk = Buffer.from("not an image at all");
    expect(await toStoredImage(junk)).toEqual(junk);
  });
});

describe("the stored name agrees with the bytes", () => {
  it("renames whatever the caller called it", () => {
    expect(asWebpName("face.png")).toBe("face.webp");
    expect(asWebpName("stage-kitchen-99.jpeg")).toBe("stage-kitchen-99.webp");
  });

  it("leaves a name that is already right alone", () => {
    expect(asWebpName("portrait-1234.webp")).toBe("portrait-1234.webp");
  });

  it("gives an extensionless name one", () => {
    expect(asWebpName("noext")).toBe("noext.webp");
  });

  it("keeps dots that are part of the name", () => {
    expect(asWebpName("stage-v1.2-final.png")).toBe("stage-v1.2-final.webp");
  });
});
