# You can say who you are

**Date:** 2026-09-14
**Scope:** apps/canvas, apps/conductor, packages/config, packages/protocol

## What changed

- **Personas.** A reader writes one or more, each with a name, a bio, a
  personality, hobbies, likes, dislikes, pronouns, a picture and the chapters of
  their life. Reached from the account card on the home screen.
- One persona is **used everywhere**; any character can be **pinned** to a
  different one. The first written becomes the default, and deleting the default
  hands it to whatever is left.
- The character is told who it is talking to. `readerContext` assembles the
  persona into a block that sits between the character's own persona and its
  state, leaving out anything unwritten.
- **Suggestions, the proactive opener and the rewrite** are told too, each
  framed for its job: a character is told *who it is talking to*, the suggestion
  writer *whose voice it is writing in*.
- **Characters gained likes and dislikes**, injected beside their rules.
- A persona can be **drawn**: the conductor reads what the reader wrote,
  describes a plausible face, and paints it on the queue.

## Why

**A character knew nothing about the person in front of it.** Every reply, every
suggested line and every unprompted message was written for a stranger. The
transcript was the only thing carrying any sense of who the reader was, and it
carries it badly — a name mentioned once, forty turns ago.

**The suggestion writer needed the opposite framing to the character.** Both need
the same facts and use them differently: one is answering this person, the other
is writing *as* them. Handing both the same block produced replies that recited
the reader's biography back at them.

**Authoring outside the character card had no context at all.** Asking for an
outfit, a place, a photo or a chapter sent an empty context object, so the model
was writing for a character it had never heard of. The request now carries a
character or a persona, and the conductor fills in the rest from what it already
holds — with anything the client sent winning, so an unsaved draft is never
overwritten by what is stored.

**Pronouns are the one fact an image model cannot guess.** The appearance prompt
asks for features with no sentence around them, deliberately, so nothing
downstream said whether the subject was a woman, a man or neither. A she/her
character came back a man. Pronoun sets carry a figure now, and it leads the
prompt. They/them stays "a person" rather than guessing.
