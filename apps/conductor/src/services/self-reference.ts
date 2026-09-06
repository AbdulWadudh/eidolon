const LABEL_SEPARATOR = String.raw`\s*[:\-–—]\s*`;
const SPLIT_LINES = /\r?\n/;
const PLAYER_LABEL = /^(?:player|you)\s*[:\-–—]\s*/i;
// Colon only, for text she wrote. A dash is punctuation in a real line —
// "You — honestly, I have no idea" is something she might say.
const READER_LABEL = /^(?:player|user|you)\s*:\s*/i;
const ESCAPABLE = /[.*+?^${}()|[\]\\]/g;
const ACTION = /\*[^*]*\*/g;

function literal(value: string): string {
  return value.replace(ESCAPABLE, String.raw`\$&`);
}

const BRACKET_DIRECTION = /\[([^\]]+)\]/g;

/**
 * The app writes actions in *asterisks*. The model also reaches for square
 * brackets — "[Ines Vaz's phone rings, she answers it] Alright, let me take
 * this." — which reads as a script direction rather than as her. The `[`
 * character cannot be a stop sequence, because the state block that closes a
 * turn opens with one, so the shape is converted after the fact instead.
 *
 * A bracket carrying a colon is left alone: that is the state block or the
 * photo note, both of which are handled by the code that owns them.
 */
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

/**
 * Example dialogue is written as a transcript, which is the clearest way to show
 * a small model how someone talks — and the model copies the speaker label
 * straight into its reply: "Halima: *nods* That sounds rough." The label is
 * removed rather than the examples, because the examples are what make the voice.
 */
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

  // The transcript labels the reader's turns PLAYER, and the model copies
  // whichever label it saw last as readily as its own — so she opened every
  // reply with "PLAYER:" while still speaking as herself. Her name and the
  // reader's are both stripped, and both are checked, because she reaches for
  // either one.
  return text.replace(READER_LABEL, "").trimStart();
}

/**
 * A reply that opens with the character's own name and a verb is a script
 * direction, not a message: "Cass leans against the bar, arms crossed." The
 * persona prompt forbids it and the model does it anyway once it has been shown
 * a transcript, so it is detected rather than asked for.
 */
export function narratesInThirdPerson(reply: string, name: string): boolean {
  const spoken = stripSpeakerLabel(reply, name).trim();
  if (spoken.length === 0) return false;

  const given = firstName(name);
  if (given.length === 0) return false;

  // Inside asterisks a name is a stage direction, which is a separate concern.
  const outside = spoken.replace(ACTION, " ").trim();
  const opener = new RegExp(`^${literal(given)}\\s+[a-z]`);
  const thirdPerson = new RegExp(`^${literal(given)}\\b[^.!?]*\\b(?:she|her|hers)\\b`, "i");

  return opener.test(outside) || thirdPerson.test(outside);
}

/**
 * The lines the character speaks in her own example dialogue. They are shown to
 * teach a voice and the model recites them back word for word, so they join the
 * set the repetition guard already checks against.
 */
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
