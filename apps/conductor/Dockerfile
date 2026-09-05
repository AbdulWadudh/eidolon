# Conductor gateway image.
#
# Build context is the repository root, not this directory - the conductor
# depends on @eidolon/protocol and @eidolon/tokens through the workspace, and
# Bun resolves those to real paths under /app/packages.
#
#   docker build -f apps/conductor/Dockerfile -t eidolon-conductor .

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.1-slim AS deps
WORKDIR /app

# Manifests only, so this layer survives every change that is not a dependency
# change. bun install needs the full workspace graph present to resolve
# "workspace:*", which is why apps/canvas is listed despite never being built.
COPY package.json bun.lock ./
COPY apps/conductor/package.json apps/conductor/
COPY apps/canvas/package.json apps/canvas/
COPY packages/protocol/package.json packages/protocol/
COPY packages/tokens/package.json packages/tokens/
COPY packages/tsconfig/package.json packages/tsconfig/

# --filter keeps the Expo and React Native tree out: apps/canvas is a workspace
# member but ships nothing to the server, and installing it unfiltered adds
# hundreds of megabytes and a native toolchain this image never invokes.
# --production drops typescript and the type packages; Bun executes TypeScript
# itself and never loads the compiler.
RUN bun install --frozen-lockfile --production --filter '@eidolon/conductor'

# Two prunes, together worth 428 MB of a 1.13 GB image.
#
# 1. LanceDB and sharp ship a prebuilt binary per platform as optional
#    dependencies and pick one at load time by libc. This base is Debian, so
#    every musl build is weight that can never be opened.
#
# 2. onnxruntime and @huggingface/transformers back LanceDB's *built-in*
#    embedding functions - the registry that turns text into vectors inside the
#    database. Eidolon never uses it: embeddings arrive already computed, from
#    generateMockEmbedding today and from the inference service later. Storing,
#    indexing and vector-searching are all unaffected, and the container test
#    that inserts a memory and reads it back covers exactly that.
#
#    If someone does reach for lancedb.embedding.getRegistry(), it will fail to
#    resolve onnxruntime at runtime. That is this line, not a broken install.
RUN rm -rf node_modules/.bun/@lancedb+lancedb-linux-*-musl@* \
           node_modules/.bun/@img+sharp-libvips-linuxmusl-* \
           node_modules/.bun/@img+sharp-linuxmusl-* \
           node_modules/.bun/onnxruntime-node@* \
           node_modules/.bun/onnxruntime-web@* \
           node_modules/.bun/@huggingface+transformers@*

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.1-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    EIDOLON_DATA_DIR=/data/eidolon

# Created here rather than left to the volume mount so it carries the bun
# user's ownership. Docker seeds a fresh named volume from the image path it
# covers, so the mounted volume comes out writable by a non-root process.
RUN mkdir -p /data/eidolon && chown -R bun:bun /data

# Source first. @eidolon/protocol and @eidolon/tokens are source-only packages
# that apps/conductor/node_modules symlinks to, so these paths have to exist
# exactly as the links expect or every import of them fails at startup.
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun packages/ ./packages/
COPY --chown=bun:bun apps/conductor/package.json apps/conductor/tsconfig.json ./apps/conductor/
COPY --chown=bun:bun apps/conductor/src ./apps/conductor/src

# Then the dependency trees, layered over the source. Bun installs into an
# isolated store at the workspace root and links each package into its
# consumer, so every one of these has to come across: copying the leaves alone
# lands a tree of dangling symlinks, and copying the store alone leaves nothing
# pointing into it. packages/protocol carries its own zod.
COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=deps --chown=bun:bun /app/apps/conductor/node_modules ./apps/conductor/node_modules
COPY --from=deps --chown=bun:bun /app/packages/protocol/node_modules ./packages/protocol/node_modules

USER bun
WORKDIR /app/apps/conductor
EXPOSE 3000

# Bun itself is the HTTP client. The slim base carries neither curl nor wget,
# and adding one just to answer this would be a package and a CVE surface for a
# single request.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health'); process.exit(r.ok ? 0 : 1)"

# Run the entrypoint directly. No build step: Bun executes TypeScript, and the
# "@/*" alias resolves from apps/conductor/tsconfig.json, which is why the
# working directory matters here.
CMD ["bun", "run", "src/index.ts"]
