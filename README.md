# Jobseek

Jobseek automates the repetitive parts of searching, qualifying, and applying to roles across major job boards. It relies on the [Wallcrawler](https://github.com/Volpestyle/wallcrawler) automation suite for headless browsing, session management, and scraping.

## Stack Overview

- **API server**: Node 20 + [Hono](https://hono.dev/) (`server/`) served with `tsx`
- **Web client**: React 19 + TanStack Router + React Query + Shadcn UI on Vite (`src/`)
- **Shared code**: Contexts, hooks, components, and Wallcrawler integrations living under `components/`, `contexts/`, `hooks/`, and `lib/`
- **Infrastructure**: AWS resources defined with CDK (`cdk/`)
- **Legacy Next.js app (removed)**: The App Router implementation has been deleted; the Vite client + Hono server now expose all APIs. Sign-in UI will move to a dedicated Hono/React flow next.

## Migration Status (Next.js → Node + Hono)

✅ React 19 client created in `src/` with TanStack Router + React Query skeleton
✅ Vite dev/build flow with `/api` proxy to the Node server
✅ Hono server now owns `/api/auth/*` via Auth.js core; anonymous cookie issuance lives alongside it
✅ Wallcrawler search start/stream/session endpoints, job search results, saved jobs/searches, board preferences, resumes, applications, profiles, and migration API now run on Hono
✅ React component layer no longer depends on Next.js runtime directives; everything now compiles cleanly under Vite + Hono

⚠️ Still to migrate

- Polish the Auth.js-based sign-in/refresh UX and flesh out dedicated error handling on the new Hono endpoints
- Wire the CloudFront/Lambda@Edge deployment into CI (current script is manual)
- Expand automated tests around anonymous session migration and storage helpers now that everything lives outside the Next runtime

See `docs/ARCHITECTURE.md` for deeper context and the open migration checklist.

## Local Development

1. Install dependencies (this repo expects the Wallcrawler monorepo adjacent to `jobseek` so pnpm links resolve):
   ```bash
   pnpm install
   ```
2. Start both the API server and Vite dev server with one command:
   ```bash
   pnpm dev
   ```
   This spawns the Hono backend on port 3000 and the Vite client on `http://localhost:5173`, with `/api/*` proxied to the backend.

   For a smooth local run, create a `.env.local` with the minimum auth and AWS stubs:
   ```env
   AUTH_SECRET=local-dev-secret
   AUTH_REDIRECT_ALLOWLIST=http://localhost:5173
   ANONYMOUS_JWT_SECRET=local-anon-secret
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=local
   AWS_SECRET_ACCESS_KEY=local
   DYNAMODB_USERS_TABLE=jobseek-users-dev
   DISABLE_RATE_LIMITS=true
   # Optional: relax anonymous rate limits locally
   # RATE_LIMIT_ANON_SESSION_MAX=500
    ```
   Replace any placeholder values with real credentials whenever you want to exercise the full stack (sign-in, rate limiting, DynamoDB persistence, etc.).

Additional scripts:

- `pnpm client:build` – build the Vite client
- `pnpm client:preview` – preview the built client
- `pnpm server:start` – run the Hono server without file watching
- `pnpm lint` – lint the repository
- `pnpm mermaid:generate` – render Mermaid diagrams in docs/mermaid

## Workspace Layout

- `src/` — React 19 client entry point (`App`, routes, providers)
- `server/` — Node + Hono server (now owns all APIs)
- `components/`, `hooks/`, `contexts/`, `lib/` — shared UI and domain logic reused across runtimes
- `cdk/` — AWS CDK stacks for infrastructure
- `docs/` — reference documentation and migration notes
- `public/` — static assets served by the client

## Documentation

- Architecture — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Auth architecture + migration notes — [`docs/AUTH_ARCHITECTURE.md`](docs/AUTH_ARCHITECTURE.md)
- Deployment & environment setup — [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- Rate limiting — [`docs/RATE_LIMITING.md`](docs/RATE_LIMITING.md)
- Anonymous token lifecycle — [`docs/JWT_TOKEN_LIFECYCLE.md`](docs/JWT_TOKEN_LIFECYCLE.md)



## Wallcrawler Workspace Links

This repo expects sibling packages via pnpm links:

- `@wallcrawler/sdk` → `../wallcrawler/packages/sdk-node`
- `@wallcrawler/components` → `../wallcrawler/packages/components`
- `@wallcrawler/stagehand` → `../wallcrawler/packages/stagehand`

Ensure the Wallcrawler repository lives alongside `jobseek` (e.g. `…/web/wallcrawler` and `…/web/jobseek`).

## Next Steps

The priority items for finishing the migration are called out in the docs. In short: wire up the Auth.js/Hono sign-in experience, finish cleaning up the client auth/storage layers, and update the CDK deployment to ship the Hono server + Vite client.
