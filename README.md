# Matchpass — ticketing app monorepo

Official tickets for football matches, concerts, festivals, comedy, classical music and cinema.
A Turborepo + pnpm monorepo with a Next.js app, an atomic design system, shared API contracts and a mocked Express API.
End-to-end tests live in the sibling repository [`../ticketing-app-e2e`](../ticketing-app-e2e).

## Workspace

| Path                         | Package                   | What it is                                                                                                  |
| ---------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/matchpass-web`         | `matchpass-web`           | Next.js 16 app (App Router) — TanStack Query + axios, react-hook-form + zod, runtime feature flags          |
| `apps/dashboard`             | `dashboard`               | Next.js 16 staff dashboard — one app for admins, operations and event organisers (role-based)               |
| `apps/mock-api`              | `mock-api`                | Express 5 + TypeScript mock of the Matchpass API — in-memory, seeded, fully validated and tested            |
| `apps/ui-showcase`           | `ui-showcase`             | Vite app hosting **Storybook** for the design system (stories, autodocs, a11y addon, story tests)           |
| `packages/design-system`     | `@repo/design-system`     | Atomic design system (atoms → molecules → organisms → templates → pages) on Tailwind CSS v4 + shadcn/ui     |
| `packages/i18n`              | `@repo/i18n`              | English/Arabic: locales, `/en` `/ar` paths, translator with plurals, Arabic catalog, number/date formatting |
| `packages/contracts`         | `@repo/contracts`         | zod schemas + types shared by the API, the app and the design system (domain, requests, forms, formatting)  |
| `packages/typescript-config` | `@repo/typescript-config` | Shared tsconfig presets                                                                                     |

> `apps/web`, `apps/docs`, `packages/ui` and `packages/eslint-config` are the untouched `create-turbo` starter and can be deleted.

## Getting started

Requirements: Node 24 (`.nvmrc`) and pnpm 11.

```sh
pnpm install
pnpm dev                # web on http://localhost:3000, staff dashboard on http://localhost:3001, mock API on http://localhost:4000/api
pnpm dev:dashboard      # staff dashboard + mock API only
pnpm dev:showcase       # Storybook on http://localhost:6006
```

Demo account (seeded with tickets, an approved Fan ID and linked fans):

| Mobile         | Password       | SMS code (all sign-ups) |
| -------------- | -------------- | ----------------------- |
| `10 1234 5482` | `matchpass123` | `123456`                |

Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined. Promo codes: `MATCHPASS10`, `WELCOME50`. Presale code: `LAYLA24`.

**Dev autofill.** In development (`pnpm dev`) every form shows a dashed **Autofill · DEV** button that fills it with data that works against the mock API: demo login, a fresh random sign-up, the SMS code, password reset, sample Fan ID photos, linked fan, checkout + promo code, presale code, transfer recipient, resale price/payout, refund details and notification preferences. The mock payment page has links to prefill the succeeding or declined test card. The buttons come from `devTools` on the design system's `UIProvider` and never render in production builds; sample values live in `packages/design-system/src/lib/dev-samples.ts`.

**Images.** Seeded events, teams and people have photos (`apps/matchpass-web/public/images`, credits in `CREDITS.md` there). The API returns same-origin `/images/...` paths, so they satisfy the CSP and work offline; components fall back to the themed / initials look if an image is missing.

**Staff dashboard** (`apps/dashboard`, http://localhost:3001). One app for three roles; the menu, pages and actions follow each role's permissions (`permissionsByRole` in `@repo/contracts`), and the API enforces the same permissions on every call. All seeded staff use the password `matchpass-staff`; in development the sign-in page has one autofill button per role.

| Role       | Email                   | Can                                                                                                            |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Admin      | `admin@matchpass.app`   | everything: sales, events (postpone / cancel / reopen), organiser requests, fans (suspend), payouts, audit log |
| Operations | `ops@matchpass.app`     | Fan ID reviews, refund decisions, order and fan lookup, match-day entry (gate scanner)                         |
| Organiser  | `hany@nilefc.example`   | own events only (Nile FC): sales, entry, payouts; asks an admin to cancel or postpone                          |
| Organiser  | `dina@nilelive.example` | same, for Nile Live Productions                                                                                |

Every decision is written to the audit log, and fans are notified (Fan ID approved / rejected with the reason, refund approved / rejected, event postponed or cancelled — cancelling refunds every ticket automatically). The scanner's **Use a sample ticket** button (development only) fetches a live QR for an unscanned ticket of the chosen event.

**Arabic.** Every page of the site and the dashboard exists in English (`/en/...`) and Arabic (`/ar/...`, right-to-left, Cairo font with Arabic line heights). Paths without a language redirect to the remembered or browser language. API content (event names, labels, notifications, errors) is translated by the API when the request asks for Arabic (`Accept-Language: ar`); tests crawl every fan and staff endpoint and fail on English left in an Arabic response. Interface strings are keyed by their English text (`t("…")`), and catalog tests fail on any string without an Arabic translation.

## Scripts

| Command                     | Does                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| `pnpm verify`               | lint + type-check + unit tests + build for every package (Turbo) |
| `pnpm test`                 | all unit/integration tests                                       |
| `pnpm test:coverage`        | tests with V8 coverage                                           |
| `pnpm build` / `pnpm start` | production build / run web + dashboard + mock API                |
| `pnpm format`               | Prettier                                                         |

## Architecture

```
browser ──► Next.js (matchpass-web) ──/api/* BFF──► API_ORIGIN (mock-api locally)
   │          │  httpOnly session cookie → Authorization header, CSRF origin check, request ids
   │          │  TanStack Query + axios, every response validated by @repo/contracts
   │          └─ renders @repo/design-system pages (pure, prop-driven, zod-validated props)
   └─ card details only ever go to the payment provider's hosted page (/api/payments/:session)

staff ──► Next.js (dashboard) ──/api/staff/* BFF──► API_ORIGIN
             httpOnly SameSite=Strict staff cookie, CSRF check, only staff endpoints proxied,
             /images rewritten to WEB_ORIGIN, role menu + section guard, @repo/design-system/dashboard
```

- **Design system.** shadcn/ui primitives (generated with the shadcn CLI) restyled with Matchpass tokens, composed into atoms, molecules, organisms, templates and full **pages**. Every component validates its props with zod (throws `PropValidationError` in dev/test) and is fully controlled; forms use react-hook-form with the shared zod schemas. Each component has unit + axe accessibility tests, and every Storybook story is rendered and axe-checked in CI.
- **Dates.** All date maths and formatting go through dayjs (utc + timezone plugins) in `@repo/contracts` (`datetime.ts`), so the API and UI show identical Cairo-time labels.
- **Data.** Client components fetch with TanStack Query through a typed axios layer (`lib/api`). Responses are parsed with the contract schemas, so API drift fails loudly. Home and event pages are server-rendered and hydrated into the query cache; event pages also emit schema.org `Event` JSON-LD and Open Graph metadata, and `/sitemap.xml` lists every event.
- **Auth.** The API token lives only in an httpOnly, SameSite=Lax cookie set by the BFF (`app/api/[...path]/route.ts`); page scripts never see it. Auth state comes from `GET /me`. Protected pages redirect on the server when there's no session, and `RequireAuth` covers client navigation. State-changing requests from another site are refused (Origin / Sec-Fetch-Site).
- **Payments.** Cards are paid on the provider's hosted page (PCI scope stays with the provider); wallet and InstaPay orders wait for approval and the order page polls; Fawry bills reserve the seats for 48 hours. Declined or cancelled card payments return to checkout with the hold intact.
- **Feature flags.** `apps/matchpass-web/config/feature-flags.json` (validated by a strict zod schema + JSON schema for editors) is read **at request time** and cached by file mtime — flip a flag by editing the file, no rebuild. Disabled features disappear from navigation/CTAs and their routes return 404.

| Flag                 | Controls                                            |
| -------------------- | --------------------------------------------------- |
| `waitingRoom`        | Virtual queue before high-demand match sales        |
| `exactSeatSelection` | Picking exact stadium seats by block                |
| `cinema`             | Cinema tab, showtimes and booking                   |
| `resale`             | Selling on official resale and the resale market    |
| `refunds`            | Refund requests and tracking                        |
| `ticketTransfer`     | Transferring tickets and the transfers inbox        |
| `fanId`              | Fan ID onboarding, linked fans and calls to action  |
| `promoCodes`         | Promo codes at checkout and presale codes           |
| `notifyMe`           | "Notify me" / "Set reminder"                        |
| `parkingUpsell`      | Parking offer on match confirmations                |
| `notificationCentre` | Header notification bell and `/notifications`       |
| `addToWallet`        | Wallet passes (off)                                 |
| `arabicLanguage`     | RTL language toggle (off — needs real translations) |

## Product features

Discovery (home, browse with URL filters, matches, concerts, cinema tab with two films), waiting room, zone or exact-seat selection with **one ticket per Fan ID per match**, seats held for 10 minutes and hidden from other fans meanwhile, checkout with promo codes (WELCOME50 once per fan), hosted card payments, wallet / InstaPay / Fawry, order confirmation with calendar and receipt, **rotating server-signed entry QR** (verified at `POST /api/gate/verify`), transfers with accept / decline / cancel and 24-hour expiry, official resale (selling and **buying**, including for sold-out matches), refunds, **automatic refunds when an event is cancelled**, Fan ID with real photo uploads and asynchronous review, linked fans, account page with notification preferences, notification centre, forgot / reset password, sign-out, and help, terms, privacy and refund-policy pages (legal copy is a plain-language draft — have counsel review it before launch).

## Mock API

`apps/mock-api` implements the full contract with an in-memory store. Every request body/query is validated with the shared zod schemas and errors use one shape: `{ error: { code, message, details } }` (including `RATE_LIMITED` for repeated failed logins and wrong OTPs). Fan ID photos are multipart uploads (multer, memory only, type and 8 MB size checks). Time-based behaviour (hold expiry, payment approvals, Fawry expiry, transfer expiry, QR and refund windows, Fan ID review) is computed at read time from an injectable clock, which the tests drive.

Test-only routes (disabled in production unless `ENABLE_TEST_ROUTES=true`): `POST /api/__test__/reset`, `POST /api/__test__/fawry/:reference/pay`, `POST /api/__test__/orders/:id/expire`, `POST /api/__test__/events/:slug/cancel`. Seed accounts: Omar `1012345482`, Youssef `1098765432`, Karim (resale seller) `1155555555` — password `matchpass123`, OTP `123456`. Configuration: `apps/mock-api/.env.example`.

## Production & operations

- `docker compose up --build` runs both services from their multi-stage images (`apps/*/Dockerfile`, using `turbo prune`). The web image uses Next's standalone output (`NEXT_OUTPUT=standalone`).
- **Security:** per-request CSP nonce set in `proxy.ts` (strict `script-src`, `frame-ancestors 'none'`, violations reported to `/monitoring/csp`), HSTS and other headers in `next.config.ts`, httpOnly session cookie, CSRF origin check, submit buttons disabled until hydration (no native GET submits leaking form values). The API uses helmet, CORS allow-listing, body limits and login / OTP rate limits; `QR_SECRET` is required in production.
- **Observability:** every request carries an `X-Request-Id` through the BFF and API; both log one JSON line per event. `instrumentation.ts` reports server errors (`onRequestError`), `instrumentation-client.ts` and the error boundary report browser errors, and Core Web Vitals are sent to `/monitoring`. Set `ERROR_REPORTING_URL` to forward errors to a collector. The API exposes `/api/health` and `/api/ready`.
- **Load testing:** `pnpm load` in the E2E repo runs autocannon against the hot read paths with p99 and error-rate budgets.
- **CI:** `.github/workflows/ci.yml` runs formatting, lint, type-check, tests and build; the E2E repo's workflow runs Playwright in Chromium, Firefox and WebKit.
