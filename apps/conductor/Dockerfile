FROM oven/bun:1.3.1-slim AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/conductor/package.json apps/conductor/
COPY apps/canvas/package.json apps/canvas/
COPY packages/config/package.json packages/config/
COPY packages/protocol/package.json packages/protocol/
COPY packages/tokens/package.json packages/tokens/
COPY packages/tsconfig/package.json packages/tsconfig/

RUN bun install --frozen-lockfile --production --filter '@eidolon/conductor'

RUN rm -rf node_modules/.bun/@lancedb+lancedb-linux-*-musl@* \
           node_modules/.bun/@img+sharp-libvips-linuxmusl-* \
           node_modules/.bun/@img+sharp-linuxmusl-* \
           node_modules/.bun/onnxruntime-node@* \
           node_modules/.bun/onnxruntime-web@* \
           node_modules/.bun/@huggingface+transformers@*

FROM oven/bun:1.3.1-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    EIDOLON_DATA_DIR=/data/eidolon

RUN mkdir -p /data/eidolon && chown -R bun:bun /data

COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun packages/ ./packages/
COPY --chown=bun:bun apps/conductor/package.json apps/conductor/tsconfig.json ./apps/conductor/
COPY --chown=bun:bun apps/conductor/src ./apps/conductor/src
COPY --chown=bun:bun public ./public

COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=deps --chown=bun:bun /app/apps/conductor/node_modules ./apps/conductor/node_modules
COPY --from=deps --chown=bun:bun /app/packages/protocol/node_modules ./packages/protocol/node_modules

USER bun
WORKDIR /app/apps/conductor
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "const r = await fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health'); process.exit(r.ok ? 0 : 1)"

CMD ["bun", "run", "src/index.ts"]
