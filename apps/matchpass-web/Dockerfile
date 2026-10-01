# syntax=docker/dockerfile:1
# Build from the repository root:  docker build -f apps/matchpass-web/Dockerfile -t matchpass-web .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

# Prune the monorepo down to the web app and its workspace dependencies.
FROM base AS prepare
COPY . .
RUN pnpm dlx turbo@2.11.6 prune matchpass-web --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN pnpm turbo run build --filter=matchpass-web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/matchpass-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/matchpass-web/.next/static ./apps/matchpass-web/.next/static
# Feature flags are read at runtime — mount a different config/ to change them without rebuilding.
COPY --from=builder --chown=nextjs:nodejs /app/apps/matchpass-web/config ./apps/matchpass-web/config
USER nextjs
EXPOSE 3000
WORKDIR /app/apps/matchpass-web
CMD ["node", "server.js"]
