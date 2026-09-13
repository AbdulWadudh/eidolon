import { afterEach, describe, expect, it } from "bun:test";
import { apiPath } from "@eidolon/config";
import { createCharacter } from "@/db/characters";
import { getCharacterLook, getCharacterOutfit, setCharacterOutfit } from "@/db/look";
import { app } from "@/index";
import { AUTHED, remember, wipe } from "./support/characters";

afterEach(wipe);

describe("a chosen outfit", () => {
  it("is nothing until somebody picks one", () => {
    const character = remember(createCharacter({ name: "Outfit Fresh" }));
    expect(getCharacterOutfit(character.id)).toBeNull();
    expect(getCharacterLook(character.id).outfit).toBeNull();
  });

  it("is kept and read back through the look", () => {
    const character = remember(createCharacter({ name: "Outfit Kept" }));
    setCharacterOutfit(character.id, "green linen shirt, sleeves rolled");

    expect(getCharacterOutfit(character.id)).toBe("green linen shirt, sleeves rolled");
    expect(getCharacterLook(character.id).outfit).toBe("green linen shirt, sleeves rolled");
  });

  it("is cleared by an empty one, so photos vary again", () => {
    const character = remember(createCharacter({ name: "Outfit Cleared" }));
    setCharacterOutfit(character.id, "red coat");
    setCharacterOutfit(character.id, null);

    expect(getCharacterOutfit(character.id)).toBeNull();
  });

  it("travels over the look route, blank meaning clear", async () => {
    const character = remember(createCharacter({ name: "Outfit Route" }));
    const url = `${apiPath("characters")}/${character.id}/look`;

    const set = await app.request(url, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ outfit: "  navy coat, scarf  " }),
    });
    const body = (await set.json()) as { character: { outfit: string | null } };

    expect(set.status).toBe(200);
    expect(body.character.outfit).toBe("navy coat, scarf");

    const cleared = await app.request(url, {
      method: "PATCH",
      headers: AUTHED,
      body: JSON.stringify({ outfit: "" }),
    });
    const after = (await cleared.json()) as { character: { outfit: string | null } };

    expect(after.character.outfit).toBeNull();
  });
});
