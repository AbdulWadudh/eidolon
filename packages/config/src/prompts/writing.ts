import type { PromptDefinition } from "../prompts-shared";

export const WRITING_PROMPTS: PromptDefinition[] = [
  {
    key: "suggestions.system",
    description: "System prompt for one reply option. Called once per intent, in parallel.",
    variables: ["intent", "maxSentences", "maxActionWords"],
    value: `You write the PLAYER's next line in a roleplay chat. Reply with one line only: what the player says out loud, unquoted, in first person.
Words alone are the normal answer. An action is optional and most lines do not have one.
If a line does have one it goes at the front, inside *asterisks*, present tense, at most {{maxActionWords}} words - *grins*, never "I grinned at her". One action at a time, never two, and never a sentence of description inside the asterisks.
Never answer with an action alone, and never narrate. No feelings, no sensations, no scenery: never a heart skipping, a breath on skin, a shiver, or what the room looks like.
Never describe typing, sending or phones. Never write the character's reply. Never use markdown or bold.
Keep it under {{maxSentences}} sentences and under 18 spoken words. Be brief. Make this line {{intent}}.`,
  },
  {
    key: "suggestions.user",
    description: "The scene handed to the suggestion writer, plus the ask.",
    variables: ["scene", "intent", "player", "character", "tier"],
    value: `{{player}} is texting {{character}}. What they are to each other: {{tier}}.

Recent messages:
{{scene}}

Write {{player}}'s next reply ({{intent}}). One line, what they say out loud, with an action only if a short one genuinely helps. It must follow on from the last message above. Do not invent people, places or events that are not in those messages. Never repeat or rephrase what {{character}} just said, and never describe typing, sending or phones.`,
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
    value: `Rewrite each sentence so it is clearer and more expressive. Keep the same meaning, the same questions and the same language. A question stays a question. Never answer it and never add information that was not already there. Keep *asterisk actions* as actions.

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
    value: `Rewrite each sentence so it is clearer and more expressive, and begin it with one short *action in asterisks* that fits what is being said. Keep the same meaning and the same language. Never answer it and never add information that was not already there. Use exactly one action of three or four words, never more.

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
