# Matchpass — ticketing app monorepo

Official tickets for football matches, concerts, festivals, comedy, classical music and cinema.
A Turborepo + pnpm monorepo with a Next.js app, an atomic design system, shared API contracts and a mocked Express API.
End-to-end tests live in the sibling repository [`../ticketing-app-e2e`](../ticketing-app-e2e).

## Workspace

| Path                         | Package                   | What it is                                                                                                 |
| ---------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/matchpass-web`         | `matchpass-web`           | Next.js 16 app (App Router) — TanStack Query + axios, react-hook-form + zod, runtime feature flags         |
| `apps/mock-api`              | `mock-api`                | Express 5 + TypeScript mock of the Matchpass API — in-memory, seeded, fully validated and tested           |
| `apps/ui-showcase`           | `ui-showcase`             | Vite app hosting **Storybook** for the design system (stories, autodocs, a11y addon, story tests)          |
| `packages/design-system`     | `@repo/design-system`     | Atomic design system (atoms → molecules → organisms → templates → pages) on Tailwind CSS v4 + shadcn/ui    |
| `packages/contracts`         | `@repo/contracts`         | zod schemas + types shared by the API, the app and the design system (domain, requests, forms, formatting) |
| `packages/typescript-config` | `@repo/typescript-config` | Shared tsconfig presets                                                                                    |

> `apps/web`, `apps/docs`, `packages/ui` and `packages/eslint-config` are the untouched `create-turbo` starter and can be deleted.

## Getting started

Requirements: Node 24 (`.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm dev                # web on http://localhost:3000, mock API on http://localhost:4000/api
pnpm dev:showcase       # Storybook on http://localhost:6006
```

Demo account (seeded with tickets, an approved Fan ID and linked fans):

| Mobile         | Password       | SMS code (all sign-ups) |
| -------------- | -------------- | ----------------------- |
| `10 1234 5482` | `matchpass123` | `123456`                |

Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined. Promo codes: `MATCHPASS10`, `WELCOME50`. Presale code: `LAYLA24`.

## Scripts

| Command                     | Does                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| `pnpm verify`               | lint + type-check + unit tests + build for every package (Turbo) |
| `pnpm test`                 | all unit/integration tests                                       |
| `pnpm test:coverage`        | tests with V8 coverage                                           |
| `pnpm build` / `pnpm start` | production build / run web + mock API                            |
| `pnpm format`               | Prettier                                                         |

## Architecture

```
browser ──► Next.js (matchpass-web) ──/api/* proxy──► API_ORIGIN (mock-api locally)
              │  TanStack Query + axios, every response validated by @repo/contracts
              └─ renders @repo/design-system pages (pure, prop-driven, zod-validated props)
```

- **Design system.** shadcn/ui primitives (generated with the shadcn CLI) restyled with Matchpass tokens, composed into atoms, molecules, organisms, templates and full **pages**. Every component validates its props with zod (throws `PropValidationError` in dev/test) and is fully controlled; forms use react-hook-form with the shared zod schemas. Each component has unit + axe accessibility tests, and every Storybook story is rendered and axe-checked in CI.
- **Data.** Client components fetch with TanStack Query through a typed axios layer (`lib/api`). Responses are parsed with the contract schemas, so API drift fails loudly. The browser only calls same-origin `/api/*`; a route handler proxies to `API_ORIGIN`, read at request time.
- **Auth.** Bearer token in `localStorage`, exposed through a `useSyncExternalStore` session store; `RequireAuth` redirects to `/login?next=…` (same-site paths only).
- **Feature flags.** `apps/matchpass-web/config/feature-flags.json` (validated by a strict zod schema + JSON schema for editors) is read **at request time** and cached by file mtime — flip a flag by editing the file, no rebuild. Disabled features disappear from navigation/CTAs and their routes return 404.

| Flag                 | Controls                                          |
| -------------------- | ------------------------------------------------- |
| `waitingRoom`        | Virtual queue before high-demand match sales      |
| `exactSeatSelection` | Picking exact stadium seats by block              |
| `cinema`             | Cinema showtimes, booking and nav link            |
| `resale`             | Official resale page, nav link and Resell buttons |
| `refunds`            | Refund requests and tracking                      |
| `ticketTransfer`     | Transferring tickets                              |
| `fanId`              | Fan ID onboarding and calls to action             |
| `promoCodes`         | Promo codes at checkout and presale codes         |
| `notifyMe`           | "Notify me" / "Set reminder"                      |
| `parkingUpsell`      | Parking offer on match confirmations              |
| `addToWallet`        | Wallet passes (off)                               |
| `arabicLanguage`     | RTL language toggle (off)                         |

## Mock API

`apps/mock-api` implements the full contract: catalog and filters, seat maps (stadium blocks, arena ticket types, concert hall, cinema showtimes), waiting room simulation, holds with 10-minute expiry, promo codes, orders (card, wallet, InstaPay, Fawry), tickets and transfers, resale listings, refunds and Fan ID verification. Every request body/query is validated with the shared zod schemas and errors use one shape: `{ error: { code, message, details } }`. `POST /api/__test__/reset` re-seeds state (disabled in production unless `ENABLE_TEST_ROUTES=true`). Configuration lives in `apps/mock-api/.env.example`.

## Production

- `docker compose up --build` runs both services from their multi-stage images (`apps/*/Dockerfile`, using `turbo prune`). The web image uses Next's standalone output (`NEXT_OUTPUT=standalone`).
- Security headers (HSTS, frame denial, nosniff, referrer and permissions policies) are set in `next.config.ts`; the API uses helmet, CORS allow-listing and a body size limit.
- CI: `.github/workflows/ci.yml` runs formatting, lint, type-check, tests and build.
