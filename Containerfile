# Stage 1: Build
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install git and certificates
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests and yarn modern config
COPY package.json yarn.lock .yarnrc.yml ./

# Enable corepack and install dependencies
RUN corepack enable && YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install

# Copy source tree
COPY . .

# Build Astro standalone SSR bundle
RUN yarn build

# Stage 2: Production Runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# OCI standard metadata labels
LABEL org.opencontainers.image.title="Modaka-Hub"
LABEL org.opencontainers.image.description="Collaborative OKF v0.1 Content Curation & Knowledge Authority Engine"
LABEL org.opencontainers.image.source="https://github.com/Quatrain/modaka-hub"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL org.opencontainers.image.vendor="Quatrain"

# Runtime system dependencies (git is required for OKF GitSyncService)
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4322

# Copy package metadata, installed node_modules, and compiled SSR bundle
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Ensure storage directories exist and apply unprivileged permissions
RUN mkdir -p /app/data/okf /app/.modaka-hub-queue && \
    chown -R node:node /app

# Non-root unprivileged execution (conforming to OKF container standards)
USER node

EXPOSE 4322

CMD ["node", "./dist/server/entry.mjs"]
