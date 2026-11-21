# ============================================================
# Multi-Stage Dockerfile for TanStack Start + Vite (Node/npm)
# ============================================================

# ------------------------------------------------------------
# Stage 1: Install Dependencies
# ------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ------------------------------------------------------------
# Stage 2: CI Validation (Typecheck, Lint, Unit Tests)
# Run standalone in CI via: docker build --target ci .
# ------------------------------------------------------------
FROM deps AS ci
COPY . .

RUN npx tsc --noEmit && \
    npm run lint && \
    npm run test

# ------------------------------------------------------------
# Stage 3: Build Production Bundle
# ------------------------------------------------------------
FROM ci AS builder
RUN npm run build

# ------------------------------------------------------------
# Stage 4: Lightweight Production Runtime
# ------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
