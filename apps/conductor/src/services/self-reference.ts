const LABEL_SEPARATOR = String.raw`\s*[:\-–—]\s*`;
const SPLIT_LINES = /\r?\n/;
const PLAYER_LABEL = /^(?:player|you)\s*[:\-–—]\s*/i;
const READER_LABEL = /^(?:player|user|you)\s*:\s*/i;
const ESCAPABLE = /[.*+?^${}()|[\]\\]/g;
const ACTION = /\*[^*]*\*/g;

function literal(value: string): string {
  return value.replace(ESCAPABLE, String.raw`\$&`);
}

const BRACKET_DIRECTION = /\[([^\]]+)\]/g;

export function bracketsToActions(reply: string): string {
  return reply
    .replace(BRACKET_DIRECTION, (match, inner: string) => {
      const text = inner.trim();
      if (text.length === 0 || text.includes(":")) return match;
      return `*${text}*`;
    })
    .replace(/\*\s*\*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

export function stripSpeakerLabel(reply: string, name: string): string {
  const candidates = [name.trim(), firstName(name)].filter((value) => value.length > 0);
  let text = reply.trimStart();

  for (const candidate of candidates) {
    const label = new RegExp(`^${literal(candidate)}${LABEL_SEPARATOR}`, "i");
    if (label.test(text)) {
      text = text.replace(label, "").trimStart();
      break;
    }
  }

  return text.replace(READER_LABEL, "").trimStart();
}

export function narratesInThirdPerson(reply: string, name: string): boolean {
  const spoken = stripSpeakerLabel(reply, name).trim();
  if (spoken.length === 0) return false;

  const given = firstName(name);
  if (given.length === 0) return false;

  const outside = spoken.replace(ACTION, " ").trim();
  const opener = new RegExp(`^${literal(given)}\\s+[a-z]`);
  const thirdPerson = new RegExp(`^${literal(given)}\\b[^.!?]*\\b(?:she|her|hers)\\b`, "i");

  return opener.test(outside) || thirdPerson.test(outside);
}

export function exampleLines(exampleDialogue: string, name: string): string[] {
  const given = firstName(name);

  return exampleDialogue
    .split(SPLIT_LINES)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !PLAYER_LABEL.test(line))
    .map((line) => stripSpeakerLabel(stripSpeakerLabel(line, name), given))
    .filter((line) => line.length > 0)
    .filter((line, index, all) => all.indexOf(line) === index);
}
