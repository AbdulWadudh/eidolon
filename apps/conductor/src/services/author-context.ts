import { getCharacter } from "@/db/characters";
import { getCharacterLook } from "@/db/look";
import { defaultPersona, getPersona } from "@/db/personas";
import type { AuthorContext } from "@/services/character-author";

export function contextForCharacter(characterId: string): AuthorContext {
  const card = getCharacter(characterId);
  if (!card) return {};

  const outfit = getCharacterLook(characterId).outfit ?? "";

  return {
    name: card.name,
    tagline: card.tagline,
    personality: card.personality,
    scenario: card.scenario,
    rules: card.rules,
    greeting: card.greeting,
    likes: card.likes,
    dislikes: card.dislikes,
    outfit,
  };
}

export function contextForReader(userId: string, personaId?: string): AuthorContext {
  const persona = personaId ? getPersona(personaId, userId) : defaultPersona(userId);
  if (!persona) return {};

  return {
    personaName: persona.name,
    personaBio: persona.bio ?? "",
    personaPersonality: persona.personality ?? "",
    personaHobbies: persona.hobbies ?? "",
    personaLikes: persona.likes ?? "",
    personaDislikes: persona.dislikes ?? "",
    personaChapter: persona.chapters
      .map((chapter) => (chapter.title ? `${chapter.title}: ${chapter.body}` : chapter.body))
      .join(" | "),
  };
}

export function isReaderField(field: string): boolean {
  return field.startsWith("persona");
}

export function surroundingContext(
  field: string,
  userId: string,
  characterId?: string,
  personaId?: string,
): AuthorContext {
  const held = isReaderField(field)
    ? contextForReader(userId, personaId)
    : characterId
      ? contextForCharacter(characterId)
      : {};

  const trimmed: AuthorContext = {};
  for (const [key, value] of Object.entries(held)) {
    if (typeof value === "string" && value.trim().length > 0) {
      trimmed[key as keyof AuthorContext] = value;
    }
  }

  return trimmed;
}
