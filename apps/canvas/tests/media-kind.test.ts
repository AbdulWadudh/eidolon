import { describe, expect, it } from "bun:test";
import { filenameOf, isUrlLike, mediaKindFor, pathOf } from "../lib/media-kind";

const AUDIO = "http://192.168.1.39:9000/eidolon-media/characters/emma/audio/a-b-c.mp3";
const IMAGE = "http://192.168.1.39:9000/eidolon-media/characters/emma/images/x.webp";

describe("what a value is worth previewing as", () => {
  it("plays an audio url", () => {
    expect(mediaKindFor(AUDIO)).toBe("audio");
    expect(mediaKindFor("https://host/x.m4a")).toBe("audio");
    expect(mediaKindFor("https://host/x.wav")).toBe("audio");
  });

  it("shows an image url", () => {
    expect(mediaKindFor(IMAGE)).toBe("image");
    expect(mediaKindFor("https://host/x.png")).toBe("image");
    expect(mediaKindFor("https://host/x.JPG")).toBe("image");
  });

  it("ignores a query string when reading the extension", () => {
    expect(mediaKindFor(`${AUDIO}?X-Amz-Signature=abc&expires=1`)).toBe("audio");
    expect(mediaKindFor(`${IMAGE}?v=2#frag`)).toBe("image");
  });

  it("leaves anything that is not a url as text", () => {
    expect(mediaKindFor("a portrait of someone, soft light")).toBe("text");
    expect(mediaKindFor("emma")).toBe("text");
    expect(mediaKindFor("")).toBe("text");
  });

  it("does not guess from a bare filename with no url around it", () => {
    expect(mediaKindFor("turn.m4a")).toBe("text");
  });

  it("leaves a url with no known extension as text", () => {
    expect(mediaKindFor("https://host/thing")).toBe("text");
    expect(mediaKindFor("https://host/notes.txt")).toBe("text");
  });

  it("accepts a root-relative path as a url", () => {
    expect(isUrlLike("/media/x.mp3")).toBe(true);
    expect(mediaKindFor("/media/x.mp3")).toBe("audio");
    expect(isUrlLike("just words")).toBe(false);
  });
});

describe("reading a url apart", () => {
  it("lowercases the path and drops the query and fragment", () => {
    expect(pathOf("https://Host/A/B.WEBP?x=1#y")).toBe("https://host/a/b.webp");
  });

  it("names the file at the end", () => {
    expect(filenameOf(AUDIO)).toBe("a-b-c.mp3");
    expect(filenameOf(`${IMAGE}?signed=1`)).toBe("x.webp");
  });
});
