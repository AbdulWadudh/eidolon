import type { PromptDefinition } from "../prompts-shared";

export const MEDIA_PROMPTS: PromptDefinition[] = [
  {
    key: "image.appearance",
    description:
      "Turns a character's written persona into a fixed description of their face and body, used once to seed the face every later photo is matched against.",
    variables: ["name", "personality"],
    value: `Read this description of a person called {{name}} and fill in what they look like, for an image model.

{{personality}}

Each field is a short phrase, two or three words, never a sentence. Never write their name, never write "she is" or "her hair is", just the detail itself. Describe only the parts of a person that do not change from one day to the next — no clothes, no glasses, no jewellery, no expression, no setting.`,
  },
  {
    key: "image.scene",
    description:
      "Plans the photo the character is about to send as a structured shot, so framing, wardrobe and light are chosen together rather than tacked on.",
    variables: ["name", "scene", "request", "framings"],
    value: `{{name}} is about to send the person they are texting a photo of: {{request}}

That is the subject. If it names a place, that is the setting. If it names another person, a pet or a thing, they go in others. Only fall back on the conversation below for what the request did not specify.

Recently they were saying:
{{scene}}

Fill in each field. Do not describe their face, hair or build anywhere; that is fixed already. setting: where this is, concrete and ordinary. A specific room, street or place, with the details that make it that place and not a stock photo.
outfit: what they are wearing today. Vary it with the setting and the weather. Not the same clothes as last time.
others: who or what else is in the frame, if anyone. A friend, a sibling, family on a trip, a pet, a plate of food. Empty for a photo of just them, and used often enough that not every photo is of a person alone.
action: what they are doing in the instant the shutter went. Not posing. Mid laugh, looking away, reaching for something, squinting into the sun, half turned.
light: the real light in that place at that hour.
framing: how the photo is taken. Choose one that fits and do not default to the same one: {{framings}}
orientation: "landscape" if the place, the view or the group is the subject, "portrait" if the person is.
look_change: only if the request asks for something different about their body or hair — dyed hair, a haircut, wet hair, a tan. Two or three words, empty otherwise.

Every field is at most twelve words. A short phrase of visual detail, not a sentence, and never mentions phones, texting or the person receiving it. Leave a field as an empty string when it does not apply — never write "none" or "nothing".

What was asked for is: {{request}}

That is the subject of this photo. If it names a place, that is where this photo happens, and the conversation above does not override it. If it names another person, a pet or a thing, they are in the frame. Only fall back on the conversation for what was not specified.`,
  },
  {
    key: "image.caption",
    description:
      "The line the character types alongside a photo they just sent. Written in their own voice, so it is asked for separately from the visual prompt.",
    variables: ["name", "personality", "subject"],
    value: `You are {{name}}. {{personality}}

You just sent someone you are texting a photo of: {{subject}}

Write the message you send with it. They can already see the picture, so do not describe it. Say the thing the picture made you want to say — react to it, complain about it, brag about it, or explain why you thought of them.

Do not name what is in the frame and do not announce that you are sending a photo. Type the offhand remark you would actually send with it.

At most twelve words — one line, the length of a real text. At most twelve words. Never write your own name. No asterisks, no quotation marks, no square brackets.`,
  },
  {
    key: "image.ideas",
    description:
      "Photo ideas offered when the reader asks for a picture, drawn from the character and where the conversation has got to.",
    variables: ["name", "scene", "count", "maxChars"],
    value: `{{name}} is texting someone and is about to send them a photo. Suggest {{count}} photos they could take right now.

The conversation so far:
{{scene}}

Every idea comes out of that conversation: the place they just mentioned, the thing they are doing, what they are eating, the weather, whoever is with them. If the conversation named something, put it in the frame. Never invent a pet, a sibling, a partner or a place that has not come up.

Return a JSON array of exactly {{count}} strings and nothing else. No explanation and no second array.

Each string labels the photo the way an album names a picture: a few words for what is in the frame, under {{maxChars}} characters. Not a sentence, not a greeting, not something anyone says out loud. Written from {{name}}'s own side, so it says "my" and "the" and never writes the name {{name}}. Never mention phones, screens, texting, sending or the taking of the photo itself.

Make the {{count}} different from each other rather than the same idea reworded. Vary who is in the frame and how close the camera is, and let at least one be something other than themselves — a view, a plate, a street, the weather. Ordinary and specific to today beats glamorous.`,
  },
];
