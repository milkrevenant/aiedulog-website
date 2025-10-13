## Multi-stage build for Next.js app in subdirectory aiedulog/

FROM node:20-slim AS base

FROM base AS deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package manifests from subdir and install deps
COPY aiedulog/package*.json ./aiedulog/
RUN cd aiedulog && npm ci

FROM base AS builder
WORKDIR /app/aiedulog

# Reuse installed deps and copy app sources
COPY --from=deps /app/aiedulog/node_modules ./node_modules
COPY aiedulog/ ./

# Build with standalone output for Docker runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
RUN npm run build

FROM base AS runner
WORKDIR /app/aiedulog

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/aiedulog/public ./public

# Ensure .next exists and owned by runtime user
RUN mkdir -p .next && chown nextjs:nodejs .next

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/aiedulog/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/aiedulog/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME=0.0.0.0

CMD ["node", "server.js"]