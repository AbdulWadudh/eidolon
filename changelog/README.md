# Change log directory

One file per change set, filed by date:

```
changelog/<year>/<month>/<YYYY-MM-DD>-<short-title>.md
changelog/2026/09/2026-09-05-android-apk-size.md
```

This is the **long form**: what changed, and — the part that cannot be recovered
from a diff — *why*, what was measured, and what was rejected. `CHANGELOG.md` at
the repo root is the short, user-facing summary that becomes GitHub release
notes.

`bun run release` appends a dated entry here automatically for each release,
containing the generated notes. Add your own files by hand when a change set
deserves more explanation than a commit subject carries — which is most of the
time for anything that took more than an hour to work out.

## Format

```markdown
# <Short title>

**Date:** YYYY-MM-DD
**Scope:** apps/canvas, apps/conductor

## What changed
## Why
## Evidence
## Follow-ups
```

Record measurements as numbers, not adjectives. "136.5 MB to 42.9 MB" survives;
"much smaller" does not.
