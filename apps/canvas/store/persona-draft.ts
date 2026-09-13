import { PERSONA_COPY } from "@eidolon/config";
import type { AuthoredFieldSpec } from "@/components/characters/CharacterFields";
import type { Persona, PersonaDraft } from "@/store/persona-api";

export type PersonaFormDraft = {
  personaName: string;
  personaBio: string;
  personaPersonality: string;
  personaHobbies: string;
  personaLikes: string;
  personaDislikes: string;
};

export const EMPTY_PERSONA: PersonaFormDraft = {
  personaName: "",
  personaBio: "",
  personaPersonality: "",
  personaHobbies: "",
  personaLikes: "",
  personaDislikes: "",
};

export type PersonaFieldKey = keyof PersonaFormDraft & string;

export const PERSONA_FIELD_ORDER: PersonaFieldKey[] = [
  "personaName",
  "personaBio",
  "personaPersonality",
  "personaHobbies",
  "personaLikes",
  "personaDislikes",
];

export const PERSONA_FIELDS: Record<string, AuthoredFieldSpec> = {
  personaName: { label: "Name", hint: PERSONA_COPY.namePlaceholder, lines: 1 },
  personaBio: { label: "Bio", hint: PERSONA_COPY.bioPlaceholder, lines: 3 },
  personaPersonality: {
    label: "Personality",
    hint: PERSONA_COPY.personalityPlaceholder,
    lines: 3,
  },
  personaHobbies: { label: "Hobbies", hint: PERSONA_COPY.hobbiesPlaceholder, lines: 2 },
  personaLikes: { label: "Likes", hint: PERSONA_COPY.likesPlaceholder, lines: 2 },
  personaDislikes: { label: "Dislikes", hint: PERSONA_COPY.dislikesPlaceholder, lines: 2 },
};

export function draftFrom(persona: Persona): PersonaFormDraft {
  return {
    personaName: persona.name ?? "",
    personaBio: persona.bio ?? "",
    personaPersonality: persona.personality ?? "",
    personaHobbies: persona.hobbies ?? "",
    personaLikes: persona.likes ?? "",
    personaDislikes: persona.dislikes ?? "",
  };
}

export function toPatch(draft: PersonaFormDraft): PersonaDraft {
  return {
    name: draft.personaName,
    bio: draft.personaBio,
    personality: draft.personaPersonality,
    hobbies: draft.personaHobbies,
    likes: draft.personaLikes,
    dislikes: draft.personaDislikes,
  };
}

export function isDirty(draft: PersonaFormDraft, persona: Persona | null): boolean {
  if (!persona) return PERSONA_FIELD_ORDER.some((key) => draft[key].trim().length > 0);

  const before = draftFrom(persona);
  return PERSONA_FIELD_ORDER.some((key) => draft[key] !== before[key]);
}
