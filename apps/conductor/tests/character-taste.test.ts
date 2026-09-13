import { afterEach, describe, expect, it } from "bun:test";
import { TEXT_FIELDS } from "@/api/characters";
import { createCharacter, EDITABLE, getCharacter, updateCharacter } from "@/db/characters";
import { remember, wipe } from "./support/characters";

afterEach(wipe);

describe("what the api accepts is what the database will write", () => {
  it("has an editable column for every field the api reads off the wire", () => {
    const dropped = TEXT_FIELDS.filter((field) => !EDITABLE.some((editable) => editable === field));

    expect(dropped).toEqual([]);
  });
});

describe("a character's likes and dislikes", () => {
  it("survives being written and read back", () => {
    const made = remember(
      createCharacter({ name: "taste probe", likes: "rain, ramen", dislikes: "small talk" }),
    );

    expect(getCharacter(made.id)?.likes).toBe("rain, ramen");
    expect(getCharacter(made.id)?.dislikes).toBe("small talk");
  });

  it("survives an edit, which the write allowlist used to drop", () => {
    const made = remember(createCharacter({ name: "taste edit probe" }));

    updateCharacter(made.id, { likes: "cold weather", dislikes: "being rushed" });

    expect(getCharacter(made.id)?.likes).toBe("cold weather");
    expect(getCharacter(made.id)?.dislikes).toBe("being rushed");
  });

  it("leaves them alone when the patch does not mention them", () => {
    const made = remember(createCharacter({ name: "taste keep probe", likes: "rain" }));

    updateCharacter(made.id, { tagline: "changed" });

    expect(getCharacter(made.id)?.likes).toBe("rain");
  });
});
