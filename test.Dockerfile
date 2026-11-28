# ==============================================================================
# STAGE 1: Build & Dependency Compilation
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies cleanly from lockfile
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build production bundle (e.g., Nitro / TypeScript)
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build && npm prune --omit=dev

# ==============================================================================
# STAGE 2: Minimal Non-Root Distroless Runtime
# ==============================================================================
FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only compiled runtime output and production dependencies owned by nonroot (65532)
COPY --from=builder --chown=nonroot:nonroot /app/.output ./.output
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

USER nonroot
EXPOSE 3000

# Distroless uses Node directly as entrypoint (no /bin/sh wrapper)
CMD [".output/server/index.mjs"]
