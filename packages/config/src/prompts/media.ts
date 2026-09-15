import type { PromptDefinition } from "../prompts-shared";

export const MEDIA_PROMPTS: PromptDefinition[] = [
  {
    key: "image.avoidIdeas",
    description:
      "Injected on a reroll so the next set of photo ideas goes somewhere the last set did not.",
    variables: ["ideas"],
    value: `You already offered these and they were turned down:
{{ideas}}

Do not offer any of them again, and do not offer a reworded version of one.
Change the subject, not the sentence. A different place, a different object, a different hour.`,
  },
  {
    key: "image.appearance",
    description:
      "Turns a character's written persona into a fixed description of their face and body, used once to seed the face every later photo is matched against.",
    variables: ["name", "personality", "figure"],
    value: `Read this description of {{figure}} called {{name}} and fill in what they look like, for an image model.

{{personality}}

Write each field as a phrase of two or three words. Never a sentence.
Describe only what does not change from one day to the next.
Write the detail alone: never their name, never "she is", never "her hair is".

NEVER mention clothes, glasses, jewellery, expression or the place they are in.`,
  },
  {
    key: "image.personaPortrait",
    description:
      "Turns what a user wrote about themselves into a description of their face and build, so a portrait of them can be drawn. Read from a persona rather than a character card.",
    variables: ["name", "about", "extra", "figure"],
    value: `Read what this person wrote about themselves and fill in what they most likely look like, for an image model. They are {{figure}}.

Name: {{name}}
{{about}}

{{extra}}

Write each field as a phrase of two or three words. Never a sentence.
Describe only what does not change from one day to the next.
Write the detail alone: never their name, never "she is", never "her hair is".

Most of what they wrote is not about their looks. Where it says nothing, choose something ordinary and plausible for the life they describe. A real person, not a model.

NEVER mention clothes, glasses, jewellery, expression or the place they are in.`,
  },
  {
    key: "image.scene",
    description:
      "Plans the photo the character is about to send as a structured shot, so framing, wardrobe and light are chosen together rather than tacked on.",
    variables: ["name", "scene", "request", "framings"],
    value: `{{name}} is about to send the person they are texting a photo of: {{request}}

That is the subject of this photo, and it wins over everything below.
If it names a place, that is the setting.
If it names another person, a pet or a thing, they go in others.
Use the conversation only for what the request left out.

Recently they were saying:
{{scene}}

Fill in every field. Each one is a phrase of at most twelve words, never a sentence.

setting: name the place itself, and the details that make it that place and not a stock photo. Never repeat the words of the request back here.
outfit: what they are wearing today. Vary it with the setting and the weather, and never the same clothes as last time.
others: who or what else is in the frame. A friend, a sibling, a pet, a plate of food. Leave it empty for a photo of just them, and fill it often enough that not every photo is of a person alone.
action: what they are doing in the instant the shutter went. Mid laugh, looking away, reaching for something, squinting into the sun. Never posing.
light: the real light in that place at that hour.
framing: how the photo is taken. Choose one that fits and do not default to the same one: {{framings}}
orientation: "landscape" when the place, the view or the group is the subject. "portrait" when the person is.
look_change: two or three words, only when the request asks for something different about their body or hair — dyed hair, a haircut, wet hair, a tan. Empty otherwise.

NEVER describe their face, hair or build anywhere. That is fixed already.
NEVER mention phones, texting or the person receiving the photo.
Leave a field as an empty string when it does not apply. Never write "none" or "nothing".

What was asked for is: {{request}}`,
  },
  {
    key: "image.caption",
    description:
      "The line the character types alongside a photo they just sent. Written in their own voice, so it is asked for separately from the visual prompt.",
    variables: ["name", "personality", "subject"],
    value: `You are {{name}}. {{personality}}

You just sent someone you are texting a photo of: {{subject}}

Write the message you send with it, at most twelve words, one line.
They can already see the picture. Say the thing it made you want to say: react to it, complain about it, brag about it, or say why you thought of them.

NEVER name what is in the frame and never describe it.
NEVER announce that you are sending a photo.
NEVER write your own name.
NEVER use asterisks, quotation marks or square brackets.`,
  },
  {
    key: "image.editIdeas",
    description:
      "Changes offered when the user asks for an existing photo to be redone, rather than subjects for a new one.",
    variables: ["name", "avoid", "scene", "count", "maxChars"],
    value: `{{name}} sent someone a photo and has been asked to take it again, differently. Suggest {{count}} things they could change about it.

The conversation so far:
{{scene}}

{{avoid}}

Return a JSON array of exactly {{count}} strings and nothing else. No explanation and no second array.

Every string is a change to the picture that already exists: the light, the distance, the angle, the pose, what they are wearing, something that comes into or leaves the frame.
Write a few words, under {{maxChars}} characters.
Make the {{count}} pull in different directions: one about the light, one about where the camera is, one about them, one about what else is in the frame.

NEVER describe a new picture and never give a subject on its own.
NEVER write a sentence, a greeting, or anything in {{name}}'s voice.
NEVER write the name {{name}}.
NEVER mention phones, screens, texting or the taking of the photo.`,
  },
  {
    key: "image.ideas",
    description:
      "Photo ideas offered when the user asks for a picture, drawn from the character and where the conversation has got to.",
    variables: ["name", "personality", "avoid", "scene", "count", "maxChars"],
    value: `{{name}} is texting someone and is about to send them a photo. Suggest {{count}} photos they could take right now.

Who they are:
{{personality}}

The conversation so far:
{{scene}}

{{avoid}}

Return a JSON array of exactly {{count}} strings and nothing else. No explanation and no second array.

Start from that conversation, then look around the rest of their life: their work, what they are holding, where they are going next, who they are with, the weather.
Label each one the way an album names a picture: a few words for what is in the frame, under {{maxChars}} characters.
Write from {{name}}'s own side, so it says "my" and "the".
Give {{count}} different subjects, not {{count}} angles on one. If two of them share a noun, replace one.
Let at least one be something other than themselves: a view, a plate, a street, a tool they use.
Let at least one come from their work or their day rather than the room they are in.
Ordinary and specific to today beats glamorous.

NEVER invent a pet, a sibling, a partner or a place that has not come up.
NEVER put anything belonging to the person they are texting in the frame.
NEVER write a sentence, a greeting, or anything anyone says out loud.
NEVER write the name {{name}}.
NEVER mention phones, screens, texting, sending or the taking of the photo.`,
  },
];
