import { LOREBOOK } from "@eidolon/config";
import { getActiveLoreEntries, type StoredLoreEntry } from "@/db/lorebook";

const NEWLINE = String.fromCharCode(10);
const KEY_ESCAPE = /[.*+?^${}()|[\]\\]/g;

export function keyPattern(key: string): RegExp {
  const escaped = key.trim().replace(KEY_ESCAPE, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:[^\\p{L}\\p{N}_]|$)`, "iu");
}

export function matchesKey(userText: string, key: string): boolean {
  if (key.trim().length === 0) return false;
  return keyPattern(key).test(userText);
}

export function unlockedFor(
  entries: StoredLoreEntry[],
  currentAffinity: number,
): StoredLoreEntry[] {
  return entries.filter((entry) => entry.requiredAffinity <= currentAffinity);
}

export function triggeredBy(entries: StoredLoreEntry[], userText: string): StoredLoreEntry[] {
  return entries.filter((entry) => entry.keys.some((key) => matchesKey(userText, key)));
}

export function formatLore(contents: string[]): string {
  const lines = contents
    .map((content) => content.replace(/\s+/g, " ").trim())
    .filter((content) => content.length > 0)
    .map((content) =>
      content.length > LOREBOOK.maxContentChars
        ? `${content.slice(0, LOREBOOK.maxContentChars)}…`
        : content,
    )
    .map((content) => `- ${content}`);

  if (lines.length === 0) return "";

  return `${LOREBOOK.header}:${NEWLINE}${lines.join(NEWLINE)}`;
}

export async function scanLorebook(
  characterId: string,
  userText: string,
  currentAffinity: number,
): Promise<string[]> {
  const unlocked = unlockedFor(getActiveLoreEntries(characterId), currentAffinity);

  return triggeredBy(unlocked, userText)
    .slice(0, LOREBOOK.maxEntriesPerTurn)
    .map((entry) => entry.content);
}

export async function loreContext(
  characterId: string,
  userText: string,
  currentAffinity: number,
): Promise<string> {
  return formatLore(await scanLorebook(characterId, userText, currentAffinity));
}
