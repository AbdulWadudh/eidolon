# Eidolon

A local-first AI companion. A phone app (**canvas**) pairs with a machine on your
LAN running the gateway (**conductor**), which talks to your local LLM, image
generation and search services. Nothing is required to leave your network.

```
apps/canvas       Expo / React Native client (Android, iOS, web)
apps/conductor    Bun + Hono gateway: REST, WebSocket, LLM, ComfyUI, SearXNG
packages/protocol Zod message schemas shared by both sides
packages/tokens   Design tokens and default theme palettes
```

## Requirements

| Tool | Version | Needed for |
|---|---|---|
| [Bun](https://bun.sh) | 1.x | everything |
| Node | 20+ | Expo CLI |
| JDK | 17+ | Android builds |
| Android SDK + NDK + CMake | see below | Android builds |

Run the preflight check — it verifies all of the above, installs workspace
packages, and installs missing Android SDK components for you:

```bash
bun run doctor
```

It reports the exact fix for anything it can't safely install itself (a JDK or
the SDK root). Use `bun run doctor:check` in CI to report without installing.

## Quick start

```bash
bun install
bun run doctor          # verify the toolchain
bun run dev:conductor   # start the gateway (prints the address to sign in at)
bun run dev:canvas      # start the Expo dev server
```

Then point the app at the gateway and sign in — see **[docs/SIGNING_IN.md](docs/SIGNING_IN.md)**.

## Scripts

| Command | Does |
|---|---|
| `bun run dev` | conductor + canvas via Turborepo |
| `bun run dev:conductor` | gateway only, on port 3000 |
| `bun run dev:canvas` | Expo dev server (`dev:canvas:web` for browser) |
| `bun run doctor` | check the toolchain, install what is safe |
| `bun run build:apk` | release APK — see [docs/BUILD_ANDROID.md](docs/BUILD_ANDROID.md) |
| `bun run release` | build, name `eidolon-v<version>.apk`, publish to GitHub Releases |
| `bun run release:dry` | same, without creating the release |
| `bun run typecheck` | `tsc --noEmit` across the workspace |
| `bun run test` | all test suites |
| `bun run lint` / `format` | Biome |
| `bun run check:size` | 300-line file limit (`:all` lists current debt) |

## Configuration

Both apps read `.env` from their own directory. Neither file is committed.

**`apps/conductor/.env`**

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | gateway port |
| `BETTER_AUTH_SECRET` | falls back to `PAIRING_SECRET` | signs sessions and password hashes. Set a real one before the gateway is reachable beyond your LAN; changing it signs everyone out |
| `BETTER_AUTH_URL` | derived LAN IP | override when behind a proxy or tunnel |

**`apps/canvas/.env`** — see `apps/canvas/.env.example`

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_GOOGLE_FONTS_API_KEY` | enables the Google Fonts browser in Theme Studio |

`EXPO_PUBLIC_*` values are inlined into the JS bundle at build time. Anyone with
the APK can read them, so restrict that key in Google Cloud and never put a real
secret behind an `EXPO_PUBLIC_` prefix.

## Documentation

- **[docs/SIGNING_IN.md](docs/SIGNING_IN.md)** — how the app reaches the gateway and who it signs in as
- **[docs/BUILD_ANDROID.md](docs/BUILD_ANDROID.md)** — building an APK, and the size work behind the current config
- **[CHANGELOG.md](CHANGELOG.md)** — release notes; `bun run release` reads them
- **[docs/THEMING.md](docs/THEMING.md)** — the theme engine, tokens and Theme Studio
- **[AGENTS.md](AGENTS.md)**, **[RULES.md](RULES.md)** — working agreements for this repo
