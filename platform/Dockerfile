# BesoinAvocat portal for Coolify or any Docker host. Build context: platform/.
# No npm dependency: the server uses Node built-ins only (node:sqlite needs 24.19+).
FROM node:24-bookworm-slim

RUN node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major !== 24 || minor < 19) { console.error('Node 24.19+ (24.x) requis, trouvé ' + process.versions.node); process.exit(1); }"

# Private state lives only in /data (a persistent volume), never in /app or a web root.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATABASE_PATH=/data/platform.sqlite \
    BLOB_DIR=/data/blobs \
    BESOINAVOCAT_SESSION_DB_PATH=/data/sessions.sqlite \
    BESOINAVOCAT_SESSION_KEY_FILE=/data/session.key \
    BESOINAVOCAT_GRANTS_FILE=/data/grants.json \
    BESOINAVOCAT_INTAKE_DB_PATH=/data/intake.sqlite

WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY public ./public
COPY tools/import-corpus.mjs tools/execute-corpus-import.mjs ./tools/
# A new named volume mounted on /data starts with this owner and mode.
RUN install -d -o node -g node -m 0700 /data

USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "server.mjs"]
