import { describe, expect, it } from "bun:test";
import { pronounsFor } from "@eidolon/config";
import { composeAppearance } from "@/services/photo-look";

const CASS = {
  age: "20s",
  face: "sharp jawline",
  eyes: "dark hazel",
  hair: "tousled brown",
  skin: "sun-kissed",
  build: "slim athletic",
};

describe("a portrait prompt says what each feature is", () => {
  it("names the part, not just the adjective", () => {
    const prompt = composeAppearance(CASS, "", pronounsFor("she").figure);

    expect(prompt).toContain("dark hazel eyes");
    expect(prompt).toContain("tousled brown hair");
    expect(prompt).toContain("slim athletic build");
    expect(prompt).toContain("sun-kissed skin");
  });

  it("leads with who is being drawn", () => {
    expect(composeAppearance(CASS, "", pronounsFor("she").figure)).toStartWith("a woman");
    expect(composeAppearance(CASS, "", pronounsFor("he").figure)).toStartWith("a man");
  });

  it("does not leave a bare adjective where a subject should be", () => {
    const prompt = composeAppearance(CASS, "", pronounsFor("she").figure);
    const head = prompt.split(", ").slice(0, 2).join(", ");

    expect(head).toBe("a woman, 20s");
  });
});
