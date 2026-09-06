import { AUTHORING, type AuthorField, type AuthorMode } from "@eidolon/config";
import { getPrompt } from "@/prompts/store";
import { CompletionUnsupportedError, completeText } from "@/services/llm";

const NEWLINE = String.fromCharCode(10);
const FENCE = /^```[a-z]*\s*|\s*```$/gi;
const WRAPPING_QUOTES = /^["'“”‘’`]+|["'“”‘’`]+$/g;
const LABEL_PREFIX = /^\s*(?:write|current|rewrite|answer|output|result)\s*:\s*/i;
const WRITE_CUE = /^Write the [^:]+:[ \t]*(.*)$/;
const LINE_BREAK = /\r?\n/;
const SECTION = /^(Field|Shape|Current):/;

export class AuthorUnavailableError extends Error {}

export type AuthorContext = Partial<Record<AuthorField, string>>;

/**
 * Everything the worked examples in the prompt answered with. Asked for a name
 * with nothing else written yet, the model returned "Ines Vaz" — the example
 * itself — so an answer that only repeats one is not an answer.
 */
export function exampleAnswers(template: string): Set<string> {
  const answers = new Set<string>();
  const lines = template.split(LINE_BREAK);

  for (let index = 0; index < lines.length; index += 1) {
    const match = WRITE_CUE.exec(lines[index] ?? "");
    if (!match) continue;

    const collected = [match[1] ?? ""];
    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next] ?? "";
      if (line.trim().length === 0 || WRITE_CUE.test(line) || SECTION.test(line)) break;
      collected.push(line);
    }

    const joined = collected.join(NEWLINE).trim().toLowerCase();
    if (joined.length > 0) answers.add(joined);

    for (const line of collected) {
      const single = line.trim().toLowerCase();
      if (single.length > 0) answers.add(single);
    }
  }

  return answers;
}

const EXAMPLE_START = /^(The character so far:|Field:)/;
const FIELD_LINE = /^Field:\s*(.+?)\s*$/;

/**
 * The worked examples, minus any that answered the field being asked for.
 *
 * Asked to rewrite "she is a radio host at night" the model returned the
 * prompt's own tagline example at every temperature, because "she is X and Y"
 * matched the example's "Current" line more strongly than anything else in
 * scope. With no same-field answer in front of it, it has to write one; the
 * remaining examples still establish the format.
 */
export function withoutFieldExamples(template: string, label: string): string {
  const lines = template.split(LINE_BREAK);
  const chunks: string[][] = [];
  let header: string[] = [];
  let current: string[] | null = null;
  let sawWriteCue = false;

  for (const line of lines) {
    if (EXAMPLE_START.test(line) && (current === null || sawWriteCue)) {
      if (current) chunks.push(current);
      current = [];
      sawWriteCue = false;
    }

    if (current === null) header.push(line);
    else current.push(line);

    if (WRITE_CUE.test(line)) sawWriteCue = true;
  }
  if (current) chunks.push(current);

  const kept = chunks.filter((chunk) => {
    const field = chunk.map((line) => FIELD_LINE.exec(line)?.[1]).find(Boolean);
    return field?.toLowerCase() !== label.toLowerCase();
  });

  header = header.filter((line, index) => line.trim().length > 0 || index < header.length - 1);

  return [header.join(NEWLINE).trim(), ...kept.map((chunk) => chunk.join(NEWLINE).trim())]
    .filter((part) => part.length > 0)
    .join(`${NEWLINE}${NEWLINE}`);
}

/**
 * The rest of the card, so a suggestion for one field agrees with the others.
 * The field being written is left out: showing the model its own draft twice
 * made it echo the draft back unchanged.
 */
export function buildContext(context: AuthorContext, exclude: AuthorField): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(context)) {
    if (key === exclude) continue;
    const text = (value ?? "").trim().replace(/\s+/g, " ");
    if (text.length === 0) continue;

    const spec = AUTHORING.fields[key as AuthorField];
    if (!spec) continue;
    lines.push(`${spec.label}: ${text}`);
  }

  const joined = lines.join(NEWLINE);
  return joined.length > AUTHORING.maxContextChars
    ? joined.slice(0, AUTHORING.maxContextChars).trimEnd()
    : joined;
}

export function buildAuthorPrompt(
  field: AuthorField,
  mode: AuthorMode,
  draft: string,
  context: string,
): string {
  const spec = AUTHORING.fields[field];
  const template = withoutFieldExamples(
    getPrompt(mode === "suggest" ? "authoring.suggest" : "authoring.enhance"),
    spec.label,
  );

  // The context goes above the field, and the field name is repeated on the
  // write cue. Asked for a tagline with a greeting as the last worked example,
  // the model wrote a greeting: whatever sits nearest the cue wins, so the
  // field being asked for has to be the last thing said.
  const parts = [template];

  if (context.length > 0) parts.push("", AUTHORING.contextLabel, context);

  parts.push("", `Field: ${spec.label}`, `Shape: ${spec.guidance}`);
  if (mode === "enhance") parts.push(`${AUTHORING.draftLabel} ${draft}`);

  parts.push(`${AUTHORING.writeLabel} ${spec.label}:`);
  return parts.join(NEWLINE);
}

export function shapeAuthored(field: AuthorField, raw: string): string {
  const spec = AUTHORING.fields[field];

  const lines = raw
    .replace(FENCE, "")
    .split(LINE_BREAK)
    .map((line) => line.replace(LABEL_PREFIX, "").trimEnd())
    .filter((line) => line.trim().length > 0);

  const joined = spec.singleLine
    ? (lines[0] ?? "").replace(/\s+/g, " ").trim()
    : lines.join(NEWLINE).trim();

  const unquoted = spec.singleLine ? joined.replace(WRAPPING_QUOTES, "").trim() : joined;

  return unquoted.length > spec.maxChars ? unquoted.slice(0, spec.maxChars).trimEnd() : unquoted;
}

/**
 * Whole-block rejection is not enough for a field written a line at a time.
 * Asked for rules, the model returned two lines lifted from the example and one
 * of its own, which the block check passed.
 */
export function stripExampleLines(written: string, examples: Set<string>): string {
  return written
    .split(LINE_BREAK)
    .filter((line) => !examples.has(line.trim().toLowerCase()))
    .join(NEWLINE)
    .trim();
}

/**
 * A rewrite that runs out of tokens mid-thought reads worse than the draft it
 * replaced, so an unfinished last sentence is dropped rather than shown.
 */
export function trimToCompleteSentence(text: string): string {
  const trimmed = text.trimEnd();
  if (trimmed.length === 0 || /[.!?…"'*)\]]$/.test(trimmed)) return trimmed;

  const cut = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?"),
  );
  return cut > 0 ? trimmed.slice(0, cut + 1) : trimmed;
}

/**
 * Told to rewrite ten words without inventing anything, the model returned four
 * sentences including a father who cleans an office. Length is the tell, and it
 * is the only part of "did not invent" that can be checked deterministically.
 */
export function isOverblown(draft: string, written: string): boolean {
  const allowed = Math.max(
    draft.trim().length * AUTHORING.enhanceGrowthRatio,
    AUTHORING.enhanceGrowthFloorChars,
  );
  return written.trim().length > allowed;
}

export function isUsableAuthored(
  mode: AuthorMode,
  draft: string,
  written: string,
  examples: Set<string> = new Set(),
): boolean {
  const clean = written.trim();
  if (clean.length === 0) return false;
  if (examples.has(clean.toLowerCase())) return false;
  if (mode !== "enhance") return true;
  if (isOverblown(draft, clean)) return false;
  return clean.toLowerCase() !== draft.trim().toLowerCase();
}

export interface AuthorRequest {
  field: AuthorField;
  mode: AuthorMode;
  draft: string;
  context: AuthorContext;
  signal?: AbortSignal;
}

export async function authorField(request: AuthorRequest): Promise<string> {
  const { field, mode, signal } = request;
  const spec = AUTHORING.fields[field];
  const draft = request.draft.trim().slice(0, AUTHORING.maxDraftChars);

  if (mode === "enhance" && draft.length === 0) {
    throw new AuthorUnavailableError("There is nothing written there to rework yet.");
  }

  const context = buildContext(request.context, field);
  const template = getPrompt(mode === "suggest" ? "authoring.suggest" : "authoring.enhance");
  const examples = exampleAnswers(template);
  const prompt = buildAuthorPrompt(field, mode, draft, context);

  async function attempt(temperature: number): Promise<string> {
    try {
      return await completeText({
        prompt,
        temperature,
        maxTokens: spec.maxTokens,
        stop: spec.singleLine
          ? [NEWLINE, AUTHORING.draftLabel, "Field:"]
          : [
              AUTHORING.draftLabel,
              "Field:",
              "Shape:",
              AUTHORING.writeLabel,
              AUTHORING.contextLabel,
            ],
        signal,
      });
    } catch (error) {
      if (error instanceof CompletionUnsupportedError) {
        throw new AuthorUnavailableError(
          "This model server cannot write text. It needs a /completions endpoint.",
        );
      }
      throw new AuthorUnavailableError(
        error instanceof Error ? error.message : "The model could not be reached.",
      );
    }
  }

  const temperatures =
    mode === "suggest" ? AUTHORING.suggestTemperatures : AUTHORING.enhanceTemperatures;

  for (const temperature of temperatures) {
    const raw = shapeAuthored(field, await attempt(temperature));
    const written = trimToCompleteSentence(stripExampleLines(raw, examples));
    if (isUsableAuthored(mode, draft, written, examples)) return written;
  }

  throw new AuthorUnavailableError("The model had nothing to offer for that one.");
}
