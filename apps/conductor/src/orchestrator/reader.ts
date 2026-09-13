import { render } from "@eidolon/config";
import { personaForCharacter } from "@/db/personas";
import { getPrompt } from "@/prompts/store";

const NEWLINE = String.fromCharCode(10);

function line(label: string, value: string | null): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? `${label}: ${trimmed}` : "";
}

export function readerProfile(characterId: string, userId: string): string {
  const persona = personaForCharacter(characterId, userId);
  if (!persona) return "";

  const taste =
    (persona.likes?.trim().length ?? 0) > 0 || (persona.dislikes?.trim().length ?? 0) > 0
      ? render(getPrompt("persona.readerLikes"), {
          likes: persona.likes?.trim() || "nothing they have said",
          dislikes: persona.dislikes?.trim() || "nothing they have said",
        })
      : "";

  const chapters = persona.chapters
    .map((chapter) => {
      const title = chapter.title?.trim();
      const body = chapter.body.trim();
      if (body.length === 0) return "";
      return title ? `- ${title}: ${body}` : `- ${body}`;
    })
    .filter((entry) => entry.length > 0);

  const reader = [
    line("Name", persona.name),
    line("About them", persona.bio),
    line("How they are", persona.personality),
    line("What they do with their time", persona.hobbies),
    taste,
    chapters.length > 0 ? `What has happened to them:${NEWLINE}${chapters.join(NEWLINE)}` : "",
  ]
    .filter((part) => part.length > 0)
    .join(NEWLINE);

  return reader.trim();
}

export function readerContext(characterId: string, userId: string): string {
  const reader = readerProfile(characterId, userId);
  if (reader.length === 0) return "";

  return render(getPrompt("persona.reader"), { reader });
}

export function readerVoice(characterId: string, userId: string): string {
  const reader = readerProfile(characterId, userId);
  if (reader.length === 0) return "";

  return render(getPrompt("persona.readerVoice"), { reader });
}
