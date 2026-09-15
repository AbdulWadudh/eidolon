import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { pronounsFor } from "@eidolon/config";
import { createCharacter } from "@/db/characters";
import { createPersona, deletePersona, listPersonas, updatePersona } from "@/db/personas";
import { userContext } from "@/orchestrator/user";
import { loadPrompts } from "@/prompts/store";
import { composeAppearance } from "@/services/photo-look";
import { remember, wipe } from "./support/characters";

const USER = "user:persona-pronouns";

beforeEach(async () => {
  await loadPrompts();
});

afterEach(() => {
  for (const persona of listPersonas(USER)) deletePersona(persona.id, USER);
  wipe();
});

describe("a user says how they should be referred to", () => {
  it("starts on they/them rather than guessing", () => {
    expect(createPersona(USER, { name: "Unset" }).pronouns).toBe("they");
  });

  it("keeps what the user picked", () => {
    const persona = createPersona(USER, { name: "Picked" });

    expect(updatePersona(persona.id, USER, { pronouns: "he" })?.pronouns).toBe("he");
    expect(updatePersona(persona.id, USER, { pronouns: "she" })?.pronouns).toBe("she");
  });

  it("refuses a value that is not a pronoun set", () => {
    const persona = createPersona(USER, { name: "Nonsense" });
    updatePersona(persona.id, USER, { pronouns: "he" });

    expect(updatePersona(persona.id, USER, { pronouns: "banana" })?.pronouns).toBe("he");
  });

  it("tells the character how to refer to them", () => {
    const persona = createPersona(USER, { name: "Wren" });
    updatePersona(persona.id, USER, { pronouns: "he", bio: "I run a ferry." });

    const character = remember(createCharacter({ name: "pronoun user probe" })).id;
    const block = userContext(character, USER);

    expect(block).toContain("he / him");
    expect(persona.id).not.toBe("");
  });

  it("draws the user as who they said they were", () => {
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
