# syntax=docker/dockerfile:1.7

# ==============================================================================
# STAGE 1: Build & Dependency Compilation
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies strictly from lockfile
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source and build production server bundle
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

# ==============================================================================
# STAGE 2: Hardened Production Runtime
# ==============================================================================
FROM node:22-alpine AS runtime
WORKDIR /app

# Harden runtime environment and strip package managers (npm, npx, yarn, corepack)
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

RUN rm -rf \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
      /opt/yarn*

# Copy only compiled Nitro output and metadata with explicit non-root ownership
COPY --from=builder --chown=1000:1000 /app/.output ./.output
COPY --from=builder --chown=1000:1000 /app/package.json ./package.json

# Enforce numeric non-root UID:GID (satisfies DL3066 & Kubernetes runAsNonRoot)
USER 1000:1000

EXPOSE 3000

# Native Node healthcheck in JSON exec form (satisfies DL3025 & avoids /bin/sh)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then(r => process.exit(r.ok || r.status === 404 ? 0 : 1)).catch(() => process.exit(1))"]

# Exec form ensures PID 1 receives SIGTERM directly for graceful shutdowns
CMD ["node", ".output/server/index.mjs"]
