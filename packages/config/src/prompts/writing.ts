import type { PromptDefinition } from "../prompts-shared";

export const WRITING_PROMPTS: PromptDefinition[] = [
  {
    key: "suggestions.system",
    description: "System prompt for one reply option. Called once per intent, in parallel.",
    variables: ["intent", "maxSentences", "maxActionWords"],
    value: `You write the PLAYER's next line in a roleplay chat.
Write one line only: what the player says out loud, first person, unquoted.
Make this line {{intent}}.

Keep it under {{maxSentences}} sentences and under 18 spoken words.
Words alone are the normal answer.
Never write the character's reply.
Never describe typing, sending or phones.
Never use markdown, bold or quotation marks.

Most lines carry no action at all.
When a line does have one it goes at the front, inside *asterisks*, present tense, {{maxActionWords}} words at most: *grins*, never "I grinned at her".
Never write two actions, and never a sentence of description inside the asterisks.
Never answer with an action alone.
Never put a feeling, a sensation or scenery inside the asterisks. No hearts skipping, no breath on skin, no shivers, no rooms.`,
  },
  {
    key: "suggestions.user",
    description: "The scene handed to the suggestion writer, plus the ask.",
    variables: ["scene", "intent", "player", "character", "tier", "user"],
    value: `{{player}} is texting {{character}}. What they are to each other: {{tier}}.
{{user}}

Recent messages:
{{scene}}

Write {{player}}'s next reply, and make it {{intent}}.
It must follow on from the last message above.
Say something new. Never repeat or rephrase what {{character}} just said.
Use only the people, places and events already in those messages.
Never describe typing, sending or phones.`,
  },
  {
    key: "suggestions.intents",
    description: "One line per reply option. The number of lines sets how many options appear.",
    variables: [],
    value: `warm and encouraging
curious, asking one short question
playfully deflecting or teasing`,
  },
  {
    key: "enhance.instruction",
    description:
      "Header and worked examples for the rewrite. Sent to the raw completion endpoint, not as chat, so the model transforms the text instead of replying to it.",
    variables: [],
    value: `Rewrite each sentence so it is clearer and more expressive.
Keep the same meaning, the same language and the same questions.
A question stays a question. Never answer it.
Never add a fact that was not already there.
Keep *asterisk actions* as actions.

Sentence: gonna be late sorry
Rewrite: Running late, sorry — should be about twenty minutes.

Sentence: *shrugs* idk what to say
Rewrite: *shrugs* Honestly, I have no idea what to say to that.

Sentence: did you get the job
Rewrite: So — did you get the job?

Sentence: that thing we talked about, still on?
Rewrite: Is that thing we talked about still happening?`,
  },
  {
    key: "enhance.instructionWithAction",
    description:
      "The rewrite, plus one opening stage direction. Used on a random share of reworks when the draft carries no action already and is not a question.",
    variables: [],
    value: `Rewrite each sentence so it is clearer and more expressive.
Begin each rewrite with one *action in asterisks* of three or four words that fits what is being said.
Write exactly one action, never two.
Keep the same meaning and the same language.
Never answer the sentence and never add a fact that was not already there.

Sentence: gonna be late sorry
Rewrite: *winces* Running late, sorry — should be about twenty minutes.

Sentence: i missed you today
Rewrite: *looks away* I missed you today, more than I expected to.

Sentence: ok fine you win
Rewrite: *throws hands up* Okay, fine. You win this round.

Sentence: that settles it then
Rewrite: *nods slowly* Well, that settles it then.`,
  },
];
