# Characters you can actually write

**Date:** 2026-09-06
**Scope:** apps/conductor, packages/config

## What changed

There was no way to create a character. `ensureCharacter` wrote a row with an id
and a capitalised name, and nothing ever filled in the rest. Both characters on
this machine had `personality` and `system_prompt` empty, so every reply came
from the generic fallback in `persona.personality`.

The conductor now has a character surface:

| Route | Does |
|---|---|
| `GET /characters` | The roster, with message counts and affinity |
| `POST /characters` | Create, id slugged from the name and made unique |
| `GET/PATCH/DELETE /characters/:id` | Read, edit any field, remove |
| `GET/POST /characters/:id/lore` | Read and write lorebook entries |
| `DELETE /characters/:id/lore/:entryId` | Remove one |
| `POST /characters/:id/portrait` | Queue a portrait on `gpuQueue` |

Four fields are new on the card, and all four reach the prompt: **scenario**,
**rules**, **example dialogue** and **greeting**. Each is injected as its own
labelled block and left out entirely when blank.

The portrait job renders through ComfyUI and writes the result to both
`avatar_url` and `face_url`, so the picture that becomes the avatar is also the
face reference every later selfie is matched against.

## Why

The replies had been getting blamed on the model. They were not the model. Same
input, same server, one authored card and one empty:

```
blank card:
  Oh my goodness, I'm so sorry to hear that you had a rough night! *gives an
  empathetic hug* Please know that you're not alone in this moment...

authored card:
  *wipes flour off her hands* You are up late. Again. Come down to the kitchen
  if you'd like a cup of strong coffee.
```

The first is the assistant the model was fine-tuned out of and falls back into
when given nothing to be. No amount of prompt tuning reaches it, because the
character block was empty.

**Example dialogue earns its place.** Every hard problem this week was solved by
showing the model rather than telling it — the rewrite endpoint, the chronicle
summariser, the web answer voice. A character card is the same lever pointed at
voice, and it is the field that changed the reply above.

**Rules are kept apart from personality** so a boundary can be edited without
rewriting who the character is, and so it can be stated flatly. Personality wants
prose; "never use pet names" does not.

**The id is slugged, not supplied.** `characterIdFor` kebab-cases the name and
steps aside when taken, so two characters called Ines get `ines` and `ines-2`
rather than one silently overwriting the other.

## Evidence

- `bun run lint`, `bun run typecheck`, `bun run check:size` — all pass.
- Conductor 330 tests pass across 28 files; 12 are new.
- Live against the running conductor: created `ines-vaz` with all eight fields,
  listed the roster, added a lore entry gated at affinity 60, and held a turn.
- Asked about the gated secret at affinity 0, the real answer stayed shut.

## Follow-ups

- The model copied a line of example dialogue nearly verbatim on the first turn.
  The prompt says never to repeat those lines and it did anyway. Fewer, shorter
  examples may hold better than more.
- Gated lore keeps the secret but the character invents a replacement rather than
  deflecting. She said the burn was boiling water. Not wrong, but not intended.
- `greeting` is stored and reaches nothing yet: no code opens an empty chat with
  it.
- No mobile UI. The roster, the create form and the lore editor are all still to
  build, and the home screen is hardcoded to `/chat/emma`.
- `emma` and `char-123` still have empty cards. One `PATCH` each fixes them.
