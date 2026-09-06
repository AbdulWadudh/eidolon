import { describe, expect, it } from "bun:test";
import {
  characterLookUrl,
  characterMemoryUrl,
  characterMessagesUrl,
  characterMessageUrl,
} from "../src/api";

// Every one of these was hand written, and two of them dropped the "://" —
// which fetch reports only as "unable to connect", behind an optimistic update
// that made the app look like it had saved.
describe("character urls", () => {
  const plain = "192.168.1.39:3000";
  const secure = "https://3000.example.com";

  it("puts a scheme separator in every one", () => {
    for (const url of [
      characterMessagesUrl(plain, "emma"),
      characterMemoryUrl(plain, "emma"),
      characterLookUrl(plain, "emma"),
      characterMessageUrl(plain, "emma", "abc"),
    ]) {
      expect(url).toStartWith("http://");
      expect(url).not.toContain("http192");
    }
  });

  it("keeps tls when the host asks for it", () => {
    expect(characterLookUrl(secure, "emma")).toStartWith("https://3000.example.com/");
    expect(characterMessageUrl(secure, "emma", "abc")).toStartWith("https://3000.example.com/");
  });

  it("escapes ids rather than pasting them in", () => {
    expect(characterLookUrl(plain, "a b")).toContain("/a%20b/look");
    expect(characterMessageUrl(plain, "emma", "a/b")).toContain("/messages/a%2Fb");
  });

  it("points at the versioned api", () => {
    expect(characterLookUrl(plain, "emma")).toContain("/api/v1/characters/emma/look");
  });
});
