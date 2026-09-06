import { describe, expect, it } from "bun:test";
import { characterGalleryUrl } from "@eidolon/config";
import { type GalleryImage, mergePage } from "@/store/gallery-api";

function image(id: string): GalleryImage {
  return {
    id,
    url: `https://media.test/${id}.png`,
    caption: null,
    kind: "photo",
    createdAt: 0,
    isAvatar: false,
  };
}

describe("appending a page of pictures", () => {
  it("keeps the order it received them in", () => {
    const merged = mergePage([image("a"), image("b")], [image("c"), image("d")]);
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("drops one that arrived twice", () => {
    // A photo landing between two requests shifts the offset, so the next page
    // can start with something already on screen.
    const merged = mergePage([image("a"), image("b")], [image("b"), image("c")]);
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("survives an empty page", () => {
    expect(mergePage([image("a")], [])).toHaveLength(1);
    expect(mergePage([], [image("a")])).toHaveLength(1);
  });
});

describe("the gallery address", () => {
  it("carries the window it is asking for", () => {
    const url = characterGalleryUrl("host:3000", "nadia-kerr", { limit: 60, offset: 120 });
    expect(url).toContain("/characters/nadia-kerr/gallery");
    expect(url).toContain("limit=60");
    expect(url).toContain("offset=120");
  });

  it("asks for the default window when given no bounds", () => {
    expect(characterGalleryUrl("host:3000", "nadia-kerr")).not.toContain("?");
  });
});
