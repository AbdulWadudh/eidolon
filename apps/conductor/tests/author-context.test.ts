import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createCharacter } from "@/db/characters";
import { createPersona, deletePersona, listPersonas } from "@/db/personas";
import { loadPrompts } from "@/prompts/store";
import {
  contextForCharacter,
  contextForReader,
  surroundingContext,
} from "@/services/author-context";
import { buildAuthorPrompt } from "@/services/character-author";
import { remember, wipe } from "./support/characters";

const READER = "user:author-context";

beforeEach(async () => {
  await loadPrompts();
});

afterEach(() => {
  for (const persona of listPersonas(READER)) deletePersona(persona.id, READER);
  wipe();
});

describe("what the writer is told about the character", () => {
  it("carries the card, not just the field being written", () => {
    const made = remember(
      createCharacter({
        name: "Context Probe",
        personality: "She never finishes a sentence she has started.",
        tagline: "a locksmith who reads palms",
        likes: "rain, old keys",
        dislikes: "being hurried",
      }),
    );

    const context = contextForCharacter(made.id);

    expect(context.name).toBe("Context Probe");
    expect(context.personality).toContain("never finishes a sentence");
    expect(context.tagline).toContain("locksmith");
    expect(context.likes).toContain("old keys");
    expect(context.dislikes).toContain("hurried");
  });

  it("reaches the prompt an outfit is written from, which used to be written blind", () => {
    const made = remember(
      createCharacter({ name: "Outfit Probe", personality: "A dockworker who sings badly." }),
    );

    const context = surroundingContext("outfit", READER, made.id);
    const prompt = buildAuthorPrompt("outfit", "suggest", "", buildContextString(context));

    expect(prompt).toContain("dockworker");
    expect(prompt).toContain("Outfit Probe");
  });

  it("tells the writer nothing about a character it was given none of", () => {
    expect(surroundingContext("outfit", READER)).toEqual({});
  });
});

describe("what the writer is told about the reader", () => {
  it("carries the persona when the field is one of the reader's own", () => {
    const persona = createPersona(READER, { name: "Wren" });
    const context = surroundingContext("personaChapter", READER, undefined, persona.id);

    expect(context.personaName).toBe("Wren");
    expect(context.personality).toBeUndefined();
  });

  it("leaves out the parts of a persona that were never written", () => {
    const persona = createPersona(READER, { name: "Bare" });
    const context = contextForReader(READER, persona.id);

    expect(context.personaName).toBe("Bare");
    expect(context.personaBio ?? "").toBe("");
  });
});

function buildContextString(context: Record<string, string | undefined>): string {
  return Object.entries(context)
    .filter(([, value]) => (value ?? "").trim().length > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}
