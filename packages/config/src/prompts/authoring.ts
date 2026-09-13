import type { PromptDefinition } from "../prompts-shared";

export const AUTHORING_PROMPTS: PromptDefinition[] = [
  {
    key: "authoring.suggest",
    description:
      "Writes one field of a character card from what has been written so far. Sent to the raw completion endpoint so the model produces the field rather than talking about it.",
    variables: [],
    value: `You are helping write a character card. Produce only the one field asked for, in the shape described, derived from the character described above it. Write nothing else: no preamble, no explanation, no label, no quotation marks around the whole thing. Never reuse a name or a line from the examples below.

The character so far:
Personality: A retired Cairo taxi driver who now repairs radios in a shop he refuses to modernise, and argues with everyone who comes in.

Field: Name
Shape: A given name, sometimes with a surname. One or two words.
Write the Name: Tarek Mansour

The character so far:
Name: Bea Whitlock
Personality: A cathedral stonemason in her sixties who has outlived two apprentices and says very little about either.

Field: Tagline
Shape: One short line about her, under ten words, written about her rather than by her.
Write the Tagline: patient hands, and a long silence behind them

The character so far:
Name: Sunny Adeyemi
Personality: A dive instructor who is relentlessly cheerful on the boat and completely different underwater.

Field: Rules
Shape: Short standing rules, one per line, of what she always or never does.
Write the Rules: Never talks about the accident on the reef.
Always checks your gear twice, even when you have already done it.
Goes quiet the moment she is under the surface.

The character so far:
Name: Vesna Petrov
Personality: A translator at a shipping company who reads people faster than she reads documents.

Field: Greeting
Shape: One or two sentences she says first, in her own voice and the first person.
Write the Greeting: *sets down her pen without looking up* You have got about four minutes before I have to be somewhere. Use them well.`,
  },
  {
    key: "authoring.enhance",
    description:
      "Rewrites one field of a character card, keeping every fact the author wrote. Sent to the raw completion endpoint.",
    variables: [],
    value: `You are helping write a character card. Rewrite the current text of the one field asked for so it is sharper and better written, in the shape described. Keep the author's meaning, their language and every fact they wrote. Never add a fact that is not already in the current text. Produce only the rewritten field: no preamble, no explanation, no label. Never reuse a line from the examples below.

Field: Tagline
Shape: One short line about her, under ten words, written about her rather than by her.
Current: she is nice and funny and likes books
Write the Tagline: warm, quick to laugh, always mid-book

Field: Rules
Shape: Short standing rules, one per line, of what she always or never does.
Current: never breaks character, doesn't use emoji, always answers questions
Write the Rules: Never breaks character.
Never uses emoji.
Always answers a direct question, even when the answer is no.

Field: Personality
Shape: Two or three sentences of prose about how she thinks and behaves, in the third person.
Current: shes very loyal and doesnt like being lied to. gets quiet when upset
Write the Personality: She is loyal to a fault and remembers every promise made to her. Lying to her costs more than it looks like it will. When something hurts her she goes quiet rather than loud, and stays that way until she has decided what she thinks.`,
  },
];

export const JOB_AUTHORING_PROMPTS: PromptDefinition[] = [
  {
    key: "authoring.jobPromptWrite",
    description:
      "Rewrites the visual prompt of a failed image job more freely, when the current one produced nothing usable.",
    variables: ["draft"],
    value: `Rewrite this image prompt so it describes the same subject in a way an image generator can render. Keep the subject and the setting. Drop anything vague, contradictory or impossible to draw. Reply with one line of comma separated visual phrases and nothing else.

Current: {{draft}}`,
  },
  {
    key: "authoring.jobPromptEnhance",
    description:
      "Sharpens the visual prompt of a failed image job, keeping every element the author asked for.",
    variables: ["draft"],
    value: `Sharpen this image prompt. Keep every element it already names and add nothing new. Make each phrase concrete and renderable. Reply with one line of comma separated visual phrases and nothing else.

Current: {{draft}}`,
  },
];

export const PROMPT_AUTHORING_PROMPTS: PromptDefinition[] = [
  {
    key: "authoring.promptWrite",
    description:
      "Writes one of the conductor's own system prompts from its description. Sent to the raw completion endpoint so the model produces the prompt rather than talking about it.",
    variables: [],
    value: `You are writing an instruction that will be given to a roleplay model as its system prompt. Produce only the instruction itself: no preamble, no explanation, no commentary about what you wrote, no quotation marks around the whole thing, no markdown fences.

Write in the imperative, addressed to the model. Prefer short declarative lines over paragraphs. Every placeholder listed below must appear in your output spelled exactly as given, including the double braces.`,
  },
  {
    key: "authoring.promptEnhance",
    description:
      "Rewrites one of the conductor's own system prompts, keeping every instruction and every placeholder. Sent to the raw completion endpoint.",
    variables: [],
    value: `You are rewriting an instruction that is given to a roleplay model as its system prompt. Make it clearer and harder to misread. Keep every rule the current version states, and never invent a new one. Produce only the rewritten instruction: no preamble, no explanation, no quotation marks around the whole thing, no markdown fences.

Every placeholder listed below must still appear, spelled exactly as given, including the double braces. Dropping one breaks the prompt.`,
  },
];
