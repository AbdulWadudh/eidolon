const LABEL_SEPARATOR = String.raw`\s*[:\-–—]\s*`;
const SPLIT_LINES = /\r?\n/;
const PLAYER_LABEL = /^(?:player|you)\s*[:\-–—]\s*/i;
const ESCAPABLE = /[.*+?^${}()|[\]\\]/g;
const ACTION = /\*[^*]*\*/g;

function literal(value: string): string {
  return value.replace(ESCAPABLE, String.raw`\$&`);
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

  return text;
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
