# The local AI stack moves into the repository

**Date:** 2026-09-06
**Scope:** stack, scripts, apps/canvas

## Why

The setup guide and the batch files that start llama.cpp, Kokoro and ComfyUI
lived in `G:\AI\EIDOLON` — on one machine, outside version control. Anyone
cloning this repository got an app that needs three servers and no way to find
out what they are or how to start them.

They are in `stack/` now. The servers themselves are not, and should not be:
they are tens of gigabytes and which build you want depends on your GPU.
`stack/README.md` is the guide to getting them, and `EIDOLON_AI_ROOT` says where
you put them.

## One window instead of three

`bun run stack:panes` opens a single Windows Terminal window split three ways —
llama.cpp down the left, ComfyUI top right, Kokoro bottom right — so the three
logs sit side by side. It falls back to separate windows when `wt.exe` is
missing.

Three things had to be right, and each failed silently:

- The semicolons separating `wt`'s sub-commands must be escaped as `^;` in a
  batch file, or `cmd` eats them as argument separators and only the first pane
  opens.
- `--title` belongs to `new-tab`, not to `wt`. Passing it globally makes `wt`
  reject the first command, so the window opens with the two split panes and no
  llama.cpp.
- `wt` will not launch a pane from a path containing `..`, which is what
  `join(import.meta.dir, "..", "stack")` produces. The script resolves the path,
  and the batch file resolves `%~dp0` through a `for` loop before using it.

ComfyUI also runs with `--disable-auto-launch` now, so it stops opening a
browser tab on every start. Its web UI is still at 127.0.0.1:8188.

## stack:down had to wait

`stack:up` and `stack:panes` are fire and forget, but `stack:down` has to finish
before the process exits or nothing is killed — `unref()` on the child meant it
reported success and left every server running. It uses `Bun.spawnSync` now.
While there, `Bun.spawn` replaces `node:child_process`, matching `doctor.ts` and
`release.ts`.

## The save button on a stale client

`expo-media-library` links native code, so a client built before it was added
cannot use it. Two separate failures came out of that.

Importing it at module scope threw `Cannot find native module
'ExpoMediaLibraryNext'`, and because `save-photo.ts` is reached from the chat
route, that throw took the route down with it — which is what
`Route "./(main)/chat/[id].tsx" is missing the required default export` was
actually reporting. Loading it at the point of use fixed the boot.

Then the button itself failed with `undefined is not a function`. The dynamic
import does not reject on such a client: Expo logs the missing native module and
leaves the exports undefined. A `try`/`catch` never fires. The functions are
checked before they are called now, and the reader gets "Saving photos needs a
new build of the app" rather than a crash.

## Evidence

- `bun run stack:panes` from a clean stop brings llama.cpp, ComfyUI and Kokoro
  up in one window; `stack:status` shows all three healthy. Three servers
  starting together take longer than one — closer to 60s than 15s.
- `bun run stack:down` stops all three and `stack:status` reports them down.
- 300 tests pass, lint 195 files clean, typecheck clean, size gate clean.

## Still open

- The batch files are Windows only. The conductor does not care what starts the
  three ports, but a Linux or macOS equivalent does not exist yet.
- `stack:up` does not start storage. It comes from `docker compose`, which this
  script deliberately does not drive; `stack:status` reports it either way.
