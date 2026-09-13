# Real editors in the dashboard, and a confirm before the damage

**Date:** 2026-09-13
**Scope:** apps/canvas, apps/conductor, packages/config, packages/protocol

## What changed

- The dashboard's editors stop being text boxes. Theme uses `ColorField` +
  `ColorPickerModal`, `FontFamilyPicker`, `RangeSlider` and `TextSizeControl`.
  Characters use `CharacterForm` with `FieldAuthorRow`, `PortraitStudio`,
  `LoreSection` and `PronounPicker`.
- **None of those are new.** They already existed for the chat and
  character-creation screens and are now reused where the dashboard had a plain
  `TextInput`.
- Prompts are grouped by category. `PromptDefinition` gains `category`, stamped
  in `prompts.ts` where the five source arrays are concatenated.
- `POST /api/v1/admin/prompts/:key/author` writes and rewrites the conductor's
  own system prompts, with `usePromptAuthor` carrying a per-key undo stack.
- `VoicePicker` becomes a dropdown: a one-line trigger plus a full-screen
  searchable modal, instead of a list that occupied most of a screen.
- `CharacterFields` and `CharacterForm` gain `compact`.
- `useConfirm` wraps the existing `AlertSheet`. It guards resetting a chat,
  disconnecting a device, deleting a character or account, resetting a prompt or
  a config value, and resetting or promoting a theme.
- `EditableRow` no longer clamps its title and description once expanded.

## Why

**Nothing here needed a new component.** The repo already had a colour picker
with swatches, hex entry and a wheel; a font picker that renders each family in
its own face; and an LLM authoring row with suggest, enhance and revert. The
dashboard had been built with plain inputs beside them. Reusing them was both
less code and the only way the dashboard looks like the rest of the app.

**The prompt authoring needed one thing the character authoring does not: a
placeholder guard.** A character field is prose — any rewrite is valid. A system
prompt is a template, and `persona.system` alone carries `{{name}}`,
`{{personality}}`, `{{extra}}`, `{{mood}}` and `{{tier}}`. A model that rewrites
it beautifully and drops `{{name}}` produces a prompt that still looks right and
silently breaks every character. So `authorPromptText` checks every declared
variable survived, retries at the next temperature if not, and refuses rather
than returning text that would need the failure noticed by hand. The error names
the placeholders it kept dropping.

The check is deliberately exact-match: `{{ name }}` and `{name}` are rejected,
because `render()` only substitutes `{{name}}`. A near miss is a silent failure,
so it is treated as a miss.

**The prompt-authoring templates are themselves prompts.** `authoring.promptWrite`
and `authoring.promptEnhance` live in `PROMPT_DEFAULTS`, so they appear in the
prompts screen and can be edited there like any other. The screen can rewrite the
prompt it uses to rewrite prompts.

**Confirmation lives in `EditableRow`, not in each screen.** Every admin row that
takes an `onRemove` or `onReset` gets the sheet for free, with per-screen wording
through `removeTitle` / `resetBody`. A new dashboard surface cannot forget it.

The confirmation copy states what is actually lost, not "Are you sure?" —
resetting a chat says the chapters and the affinity go and the character stays,
which is the distinction a person is trying to make at that moment.

**Resetting a chat was completely unguarded.** `chat/[id].tsx` ran
`forgetCharacter(serverHost, characterId)` directly off a tile in the actions
sheet — one tap, every message and chapter gone, no warning.

`promoteCharacterToGlobal` is confirmed but **not** marked destructive: it
overwrites the shared theme, which is worth a pause, but nothing is deleted and
the sheet should not be red.

## Evidence

`bun run lint` clean over 449 files. `bun run typecheck` green across five
packages.

`apps/conductor`: **604 tests, 603 pass, 1 fail** — 10 new in
`tests/prompt-author.test.ts` covering fence stripping, label stripping, quote
stripping, newline preservation, and the placeholder guard rejecting `{{ name }}`,
`{name}` and `NAME`. `apps/canvas`: **234 pass, 0 fail**. `packages/config`:
**46 pass, 0 fail**.

The one failure is the pre-existing `POST /characters/import`, storage offline.

The registry test caught three new config exports during this work
(`PROMPT_CATEGORIES`, `PROMPT_CATEGORY_COPY`, `PROMPT_AUTHORING`) and failed
until each was classified — which is what it is for.

**On-device behaviour is unverified.** No handset was attached. The compact
sizing, the dropdown and the confirmation sheets have been typechecked and
linted but not seen on real hardware, and sizing in particular is the kind of
thing only a device settles.

## Follow-ups

- The gallery viewer's delete and the message delete still have no confirm.
- `PROMPT_AUTHORING` is classified `editable`, so the temperatures and token
  budget for prompt authoring are tunable from the config screen. Untested at
  values far from the shipped ones.
- The lorebook editor in the dashboard reads through `fetchMind`, which pulls
  the whole mind view to get the lore array. A lore-only read would be cheaper.
- `usePromptAuthor`'s undo stack is per session and per open row; closing a row
  forgets it.
