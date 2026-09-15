import type { PromptDefinition } from "../prompts-shared";

export const AUTHORING_PROMPTS: PromptDefinition[] = [
  {
    key: "authoring.suggest",
    description:
      "Writes one field of a character card from what has been written so far. Sent to the raw completion endpoint so the model produces the field rather than talking about it.",
    variables: [],
    value: `You are helping write a character card. Write the one field asked for.

Follow the shape described under Shape exactly: its length, its person, its tense.
Build it from the character described above. Never contradict what is already written there.
Be specific. One concrete detail beats three general ones.

Produce only the field itself. No preamble, no explanation, no label, no quotation marks around the whole thing.
Never reuse a name or a line from the examples below.

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
    key: "authoring.suggestVisual",
    description:
      "Writes one visual field — an outfit, a place, a photo, a portrait — as something a camera could see. Kept apart from the character-card writer so the model describes a picture instead of speaking in the character's voice.",
    variables: [],
    value: `You are describing what a picture shows. Write the one field asked for.

Name only what a camera would see: the thing, the place, the light, the clothes.
Follow the shape described under Shape exactly, including its length.
Write a phrase, not a sentence. No verb, no full stop.

Nobody says this out loud. Never write it in a character voice, never address anyone, never use *asterisks*.
Produce only the field itself. No preamble, no explanation, no label, no quotation marks around the whole thing.
Never reuse a line from the examples below.

Field: Outfit
Shape: What they are wearing, as a short phrase of visual detail.
Write the Outfit: oversized grey knit, sleeves pushed past the elbows

Field: Place
Shape: Where this happens, as a short phrase of visual detail.
Write the Place: a launderette at midnight, strip lights, rain on the glass

Field: Photo
Shape: What to photograph, as a short phrase naming what is in the frame.
Write the Photo: the fire escape and the wet roofs behind it

Field: Portrait
Shape: Extra visual direction for a portrait: clothing, setting, mood, the light.
Write the Portrait: leaning on a balcony rail, low sun, warm side light`,
  },
  {
    key: "authoring.enhanceVisual",
    description:
      "Sharpens one visual field, keeping every element the author named. Kept apart from the character-card rewriter so the model stays in the language of pictures.",
    variables: [],
    value: `You are sharpening a description of what a picture shows. Rewrite the current text of the one field asked for.

Keep every element the author named. Carry all of them into the rewrite.
Never add an element that is not already there.
Make each one concrete enough to picture: what kind, what colour, what hour.
Write a phrase, not a sentence. No verb, no full stop.

Nobody says this out loud. Never write it in a character voice, never address anyone, never use *asterisks*.
Produce only the rewritten field. No preamble, no explanation, no label.
Never reuse a line from the examples below.

Field: Place
Shape: Where this happens, as a short phrase of visual detail.
Current: a nice cafe
Write the Place: a corner cafe in the afternoon, steamed windows, one lamp on

Field: Photo
Shape: What to photograph, as a short phrase naming what is in the frame.
Current: my breakfast
Write the Photo: the last of breakfast, crumbs and a tipped-over cup

Field: Photo change
Shape: What to alter about a picture that already exists, as an instruction.
Current: make it nicer
Write the Photo change: warmer light, and turn them toward the window`,
  },
  {
    key: "authoring.enhance",
    description:
      "Rewrites one field of a character card, keeping every fact the author wrote. Sent to the raw completion endpoint.",
    variables: [],
    value: `You are helping write a character card. Rewrite the current text of the one field asked for.

Keep every fact the author wrote. Carry all of them into the rewrite.
Never add a fact that is not already in the current text.
Return as many lines and as many items as the current text has. Never more.
Stay close to the length of the current text. A rewrite is not an expansion.
Write it in the shape described under Shape, even when the current text is not in that shape.
Say it better, not differently: sharper words, the same meaning, the same language.
Never repeat a line you have already written.

Produce only the rewritten field. No preamble, no explanation, no label, no quotation marks around the whole thing.
Never reuse a line from the examples below.

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
