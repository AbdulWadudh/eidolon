import { describe, expect, it } from "bun:test";
import { parseServerMessage } from "../src";

const place = (position: number, total: number, kind = "portrait") =>
  parseServerMessage({ type: "queue_place", payload: { kind, position, total } }) as {
    payload?: { position?: number; total?: number; kind?: string };
  };

describe("telling a user where their work sits in the queue", () => {
  it("carries the place and the length of the queue", () => {
    const parsed = place(2, 5);

    expect(parsed.payload?.position).toBe(2);
    expect(parsed.payload?.total).toBe(5);
    expect(parsed.payload?.kind).toBe("portrait");
  });

  it("allows the only job in the queue", () => {
    expect(place(1, 1).payload?.position).toBe(1);
  });

  it("distinguishes a photo from a portrait, since only one is announced by default", () => {
    expect(place(1, 1, "photo").payload?.kind).toBe("photo");
  });

  it("refuses a place that is not a whole number", () => {
    expect(() =>
      parseServerMessage({
        type: "queue_place",
        payload: { kind: "portrait", position: 1.5, total: 2 },
      }),
    ).toThrow();
  });

  it("refuses a kind it does not know how to announce", () => {
    expect(() =>
      parseServerMessage({
        type: "queue_place",
        payload: { kind: "backdrop", position: 1, total: 2 },
      }),
    ).toThrow();
  });
});
