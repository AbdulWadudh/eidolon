import { describe, expect, it } from "bun:test";
import { openMode, type StackRoute } from "@/lib/stack-nav";

const roster: StackRoute = { name: "(main)/index" };
const profile = (id: string): StackRoute => ({ name: "(main)/characters/[id]", params: { id } });
const chat = (id: string): StackRoute => ({ name: "(main)/chat/[id]", params: { id } });

describe("opening a chat from a character's profile", () => {
  it("takes the profile's place when that chat is not already open", () => {
    expect(openMode([roster, profile("ines-vaz")], "chat", "ines-vaz")).toBe("replace");
  });

  it("returns to the chat already open underneath", () => {
    const routes = [roster, chat("ines-vaz"), profile("ines-vaz")];
    expect(openMode(routes, "chat", "ines-vaz")).toBe("dismissTo");
  });

  it("does not mistake another character's chat for this one", () => {
    const routes = [roster, chat("nadia-kerr"), profile("ines-vaz")];
    expect(openMode(routes, "chat", "ines-vaz")).toBe("replace");
  });

  it("never counts the screen doing the asking", () => {
    expect(openMode([roster, chat("ines-vaz")], "chat", "ines-vaz")).toBe("replace");
  });

  it("copes with an empty stack", () => {
    expect(openMode([], "chat", "ines-vaz")).toBe("replace");
  });
});
