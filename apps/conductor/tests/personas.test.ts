import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createCharacter } from "@/db/characters";
import {
  addChapter,
  createPersona,
  deleteChapter,
  deletePersona,
  listPersonas,
  makeDefaultPersona,
  personaForCharacter,
  pinPersonaToCharacter,
  updateChapter,
  updatePersona,
} from "@/db/personas";
import { userContext } from "@/orchestrator/user";
import { loadPrompts } from "@/prompts/store";
import { remember, wipe } from "./support/characters";

const USER = "user:personas";

function freshCharacter(id: string): string {
  const made = remember(createCharacter({ name: id }));
  return made.id;
}

beforeEach(async () => {
  await loadPrompts();
});

afterEach(() => {
  for (const persona of listPersonas(USER)) deletePersona(persona.id, USER);
  wipe();
});

describe("the persona every character reads", () => {
  it("makes the first one the default, because nobody would read a user with none", () => {
    const first = createPersona(USER, { name: "First" });
    const second = createPersona(USER, { name: "Second" });

    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);
  });

  it("keeps exactly one default when another is chosen", () => {
    const first = createPersona(USER, { name: "First" });
    const second = createPersona(USER, { name: "Second" });

    makeDefaultPersona(second.id, USER);
    const defaults = listPersonas(USER).filter((persona) => persona.isDefault);

    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe(second.id);
    expect(first.id).not.toBe(defaults[0]?.id);
  });

  it("hands the default to whoever is left when the default is deleted", () => {
    const first = createPersona(USER, { name: "First" });
    const second = createPersona(USER, { name: "Second" });

    makeDefaultPersona(second.id, USER);
    deletePersona(second.id, USER);

    expect(listPersonas(USER).find((persona) => persona.isDefault)?.id).toBe(first.id);
  });
});

describe("which persona a character reads", () => {
  it("reads the default when nothing is pinned", () => {
    const persona = createPersona(USER, { name: "Default one" });
    const character = freshCharacter("persona-reads-default");

    expect(personaForCharacter(character, USER)?.id).toBe(persona.id);
  });

  it("reads the pinned one instead, and leaves other characters alone", () => {
    const fallback = createPersona(USER, { name: "Everywhere" });
    const pinned = createPersona(USER, { name: "Just here" });

    const one = freshCharacter("persona-pinned");
    const other = freshCharacter("persona-unpinned");

    pinPersonaToCharacter(one, USER, pinned.id);

    expect(personaForCharacter(one, USER)?.id).toBe(pinned.id);
    expect(personaForCharacter(other, USER)?.id).toBe(fallback.id);
  });

  it("falls back to the default once the pin is cleared", () => {
    const fallback = createPersona(USER, { name: "Everywhere" });
    const pinned = createPersona(USER, { name: "Just here" });
    const character = freshCharacter("persona-unpin");

    pinPersonaToCharacter(character, USER, pinned.id);
    pinPersonaToCharacter(character, USER, null);

    expect(personaForCharacter(character, USER)?.id).toBe(fallback.id);
  });

  it("refuses to pin a persona belonging to someone else", () => {
    const theirs = createPersona("user:someone-else", { name: "Not yours" });
    const character = freshCharacter("persona-not-yours");

    expect(pinPersonaToCharacter(character, USER, theirs.id)).toBe(false);
    deletePersona(theirs.id, "user:someone-else");
  });
});

describe("what the character is told about the user", () => {
  it("carries every part the user filled in", () => {
    createPersona(USER, { name: "Wren" });
    const [persona] = listPersonas(USER);

    updatePersona(persona.id, USER, {
      bio: "I run a small studio.",
      hobbies: "bouldering, film photography",
      likes: "cold weather, long drives",
      dislikes: "small talk, being rushed",
      personality: "I ask a lot of questions.",
    });
    addChapter(persona.id, USER, "Leaving the agency", "I quit in the spring.");

    const character = freshCharacter("persona-context");
    const block = userContext(character, USER);

    expect(block).toContain("Wren");
    expect(block).toContain("I run a small studio.");
    expect(block).toContain("bouldering, film photography");
    expect(block).toContain("cold weather, long drives");
    expect(block).toContain("small talk, being rushed");
    expect(block).toContain("I ask a lot of questions.");
    expect(block).toContain("Leaving the agency");
    expect(block).toContain("I quit in the spring.");
  });

  it("says nothing at all when the user has written no persona", () => {
    expect(userContext(freshCharacter("persona-silent"), USER)).toBe("");
  });

  it("leaves out the parts that were never written", () => {
    const persona = createPersona(USER, { name: "Bare" });
    const block = userContext(freshCharacter("persona-bare"), USER);

    expect(block).toContain("Bare");
    expect(block).not.toContain("Drawn to:");
    expect(block).not.toContain("What has happened to them:");
    expect(persona.chapters).toHaveLength(0);
  });
});

describe("chapters of the user's life", () => {
  it("keeps them in the order they were added", () => {
    const persona = createPersona(USER, { name: "Ordered" });

    addChapter(persona.id, USER, "One", "First thing.");
    addChapter(persona.id, USER, "Two", "Second thing.");
    const after = addChapter(persona.id, USER, "Three", "Third thing.");

    expect(after?.chapters.map((chapter) => chapter.title)).toEqual(["One", "Two", "Three"]);
  });

  it("rewrites one without disturbing the rest", () => {
    const persona = createPersona(USER, { name: "Edited" });
    addChapter(persona.id, USER, "One", "First thing.");
    const two = addChapter(persona.id, USER, "Two", "Second thing.");
    const target = two?.chapters[1]?.id ?? "";

    const after = updateChapter(target, persona.id, USER, { body: "Rewritten." });

    expect(after?.chapters[0]?.body).toBe("First thing.");
    expect(after?.chapters[1]?.body).toBe("Rewritten.");
  });

  it("removes one and leaves the others numbered as they were", () => {
    const persona = createPersona(USER, { name: "Trimmed" });
    addChapter(persona.id, USER, "One", "First thing.");
    const two = addChapter(persona.id, USER, "Two", "Second thing.");
    const target = two?.chapters[0]?.id ?? "";

    const after = deleteChapter(target, persona.id, USER);

    expect(after?.chapters.map((chapter) => chapter.title)).toEqual(["Two"]);
  });
});
