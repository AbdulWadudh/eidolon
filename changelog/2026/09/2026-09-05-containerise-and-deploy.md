# Containerise the conductor and deploy it on Coolify

**Date:** 2026-09-05
**Scope:** apps/conductor, docker-compose.yaml, docker-compose.dev.yml, scripts

## What changed

- `apps/conductor/Dockerfile` — two-stage Bun image, built from the repository
  root because the conductor imports `@eidolon/protocol` and `@eidolon/tokens`
  through the workspace. No build step: Bun executes TypeScript, and the `@/*`
  alias resolves from `apps/conductor/tsconfig.json`.
- `docker-compose.yaml` — the deployment stack, for Coolify's Docker Compose
  build pack. One service, one named volume, a healthcheck, and
  `SERVICE_FQDN_CONDUCTOR_3000` so Coolify wires the proxy.
- `docker-compose.dev.yml` — local S3-compatible storage, with
  `bun run storage:up|down|reset|logs`. `scripts/storage-env.ts` prints the
  settings, deriving the LAN address rather than hardcoding one.
- `EIDOLON_DATA_DIR` overrides the OS data path (`src/utils/paths.ts`). A
  container has no meaningful home directory, so the deployment points this at
  the mounted volume.
- `.dockerignore` — the build context is the whole monorepo, and
  `apps/canvas/android` alone would dwarf the server.

## Why

Object storage is deliberately **not** in the deployment compose. It is a
long-lived resource with its own lifecycle: redeploying the gateway must never
put the bucket at risk, and the two scale for different reasons. The conductor
reaches it over `S3_*` like any other client.

SQLite and LanceDB *are* in it, on one named volume. They are the gateway's own
state, they are useless without it, and a redeploy has to keep them — which is
the same reason they left the repository in the first place.

## Evidence

- Image builds and runs on both architectures: 702 MB on amd64, 203 MB on
  arm64 — the deployment target is `aarch64`.
- In-container round trip: bucket reached, `/health` reports every service,
  SQLite and LanceDB written, container restarted, both read back intact.
- `bun run test` — 60 pass, 0 fail. `bun run typecheck` clean.

## Rejected and learned

**Copying only `apps/conductor/node_modules`.** Bun installs into an isolated
store at the workspace root and links each package into its consumer, so that
copy lands a tree of dangling symlinks and dies on the first import
(`Cannot find module 'hono/cors'`). Both halves have to come across, plus
`packages/protocol/node_modules`, which carries its own zod.

**Installing the workspace unfiltered.** `bun install --filter '@eidolon/conductor'`
keeps Expo and React Native out entirely. Unfiltered, the image carries a native
toolchain it never invokes.

**Shipping LanceDB's embedding stack.** onnxruntime and
`@huggingface/transformers` back LanceDB's *built-in* embedding registry, which
Eidolon never uses — embeddings arrive already computed. Dropping them, plus the
wrong-libc prebuilt binaries, took the amd64 image from 1.13 GB to 702 MB. The
container test that inserts a memory and vector-searches it back is what says
this is safe.

## Coolify

Deployed as an **application** (not a service) with the `dockercompose` build
pack, from the public repo on `main`, into project `Apps` / environment
`eidolon`. Compose file `/docker-compose.yaml`, base directory `/`.

The server is `aarch64` and the proxy is Caddy, which is why the image was
checked on arm64 before anything was pushed.

Setting the domain took three attempts and the notes are worth keeping:

- `PATCH /applications/{uuid}` with `domains` — rejected.
- `docker_compose_domains` as the JSON-string map Coolify *stores* internally —
  rejected. Both fail with a bare "Validation failed".
- The API takes an **array**: `[{"name": "conductor", "domain": "https://.../:3000"}]`.
  That is a different shape from the stored value, and the error says nothing
  about it.

Setting `SERVICE_FQDN_CONDUCTOR_3000` as an env var and redeploying does not
work either: once `docker_compose_domains` holds a generated subdomain, it is
authoritative.

## Follow-ups

- `bun run lint` still reports 17 formatter errors, all in `apps/canvas` `.tsx`
  files and all pre-existing. Normalising line endings across the tree took the
  count from 45 to 17; the rest is genuine formatting nobody has run
  `biome format` over.
- Nothing calls `uploadImage`/`uploadAudio` yet — ComfyUI output and TTS still
  need routing through them.
- The image runs the conductor only. The canvas app is still built and
  distributed as an APK.
