import { describe, expect, it } from "bun:test";
import { parentOf, readable } from "../lib/storage-paths";

const NAMES = { "9eb1482d-8e59-4e45-b28f-ae49ca80dafd": "Lily" };

describe("walking back up the bucket", () => {
  it("steps into the folder that holds this one", () => {
    expect(parentOf("someone@example.com/characters/9eb1482d/images/")).toBe(
      "someone@example.com/characters/9eb1482d/",
    );
  });

  it("reaches the top rather than falling past it", () => {
    expect(parentOf("someone@example.com/")).toBe("");
    expect(parentOf("")).toBe("");
  });

  it("takes one step at a time, however deep the folder is", () => {
    let here = "a/b/c/d/";
    const walked: string[] = [];
    while (here.length > 0) {
      here = parentOf(here);
      walked.push(here);
    }

    expect(walked).toEqual(["a/b/c/", "a/b/", "a/", ""]);
  });
});

describe("showing who a folder belongs to", () => {
  it("puts her name where her id was", () => {
    expect(readable("9eb1482d-8e59-4e45-b28f-ae49ca80dafd/images", NAMES, false)).toBe(
      "Lily/images",
    );
  });

  it("leaves the id alone when the ids are asked for", () => {
    expect(readable("9eb1482d-8e59-4e45-b28f-ae49ca80dafd", NAMES, true)).toBe(
      "9eb1482d-8e59-4e45-b28f-ae49ca80dafd",
    );
  });

  it("leaves a segment it does not recognise exactly as it found it", () => {
    expect(readable("public/characters/unknown-id/a.webp", NAMES, false)).toBe(
      "public/characters/unknown-id/a.webp",
    );
  });
});
