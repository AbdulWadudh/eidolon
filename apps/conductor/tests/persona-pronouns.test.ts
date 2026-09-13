import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { pronounsFor } from "@eidolon/config";
import { createCharacter } from "@/db/characters";
import { createPersona, deletePersona, listPersonas, updatePersona } from "@/db/personas";
import { readerContext } from "@/orchestrator/reader";
import { loadPrompts } from "@/prompts/store";
import { composeAppearance } from "@/services/photo-look";
import { remember, wipe } from "./support/characters";

const READER = "user:persona-pronouns";

beforeEach(async () => {
  await loadPrompts();
});

afterEach(() => {
  for (const persona of listPersonas(READER)) deletePersona(persona.id, READER);
  wipe();
});

describe("a reader says how they should be referred to", () => {
  it("starts on they/them rather than guessing", () => {
    expect(createPersona(READER, { name: "Unset" }).pronouns).toBe("they");
  });

  it("keeps what the reader picked", () => {
    const persona = createPersona(READER, { name: "Picked" });

    expect(updatePersona(persona.id, READER, { pronouns: "he" })?.pronouns).toBe("he");
    expect(updatePersona(persona.id, READER, { pronouns: "she" })?.pronouns).toBe("she");
  });

  it("refuses a value that is not a pronoun set", () => {
    const persona = createPersona(READER, { name: "Nonsense" });
    updatePersona(persona.id, READER, { pronouns: "he" });

    expect(updatePersona(persona.id, READER, { pronouns: "banana" })?.pronouns).toBe("he");
  });

  it("tells the character how to refer to them", () => {
    const persona = createPersona(READER, { name: "Wren" });
    updatePersona(persona.id, READER, { pronouns: "he", bio: "I run a ferry." });

    const character = remember(createCharacter({ name: "pronoun reader probe" })).id;
    const block = readerContext(character, READER);

    expect(block).toContain("he / him");
    expect(persona.id).not.toBe("");
  });

  it("draws the reader as who they said they were", () => {
    const look = {
      age: "forties",
      face: "weathered",
      eyes: "grey",
      hair: "cropped",
      skin: "tanned",
      build: "broad",
    };

    expect(composeAppearance(look, "", pronounsFor("he").figure)).toStartWith("a man");
    expect(composeAppearance(look, "", pronounsFor("she").figure)).toStartWith("a woman");
    expect(composeAppearance(look, "", pronounsFor("they").figure)).toStartWith("a person");
  });
});
