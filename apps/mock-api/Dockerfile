# syntax=docker/dockerfile:1
# Build from the repository root:  docker build -f apps/mock-api/Dockerfile -t matchpass-mock-api .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS prepare
COPY . .
RUN pnpm dlx turbo@2.11.6 prune mock-api --docker

FROM base AS builder
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=mock-api && pnpm --filter mock-api deploy --prod --legacy /out

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=4000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 api
COPY --from=builder --chown=api:nodejs /out/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/apps/mock-api/dist ./dist
COPY --from=builder --chown=api:nodejs /app/apps/mock-api/package.json ./
USER api
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "dist/server.js"]
