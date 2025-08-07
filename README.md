# Jobseek Monorepo (pnpm)

Jobseek is a job search automation platform, designed to offload the repetitive nature of shifting through all the lame job slop on Linkedin, Monster, and other job boards, and help you find the jobs that are actually a good fit for you.

## How?

- Jobseek leverages [Wallcrawler](https://github.com/Volpestyle/wallcrawler) for headless browser automation and session management across job boards.

- Packages
  - `@wallcrawler/stagehand`: drives automated browsing, actions, and extraction in `lib/wallcrawler.server.ts`
  - `@wallcrawler/sdk`: session retrieval, listing, and debug links in API routes
- Local setup
  - This repo references sibling packages via pnpm links:
    - `@wallcrawler/sdk` → `../wallcrawler/packages/sdk-node`
    - `@wallcrawler/components` → `../wallcrawler/packages/components`
    - `@wallcrawler/stagehand` → `../wallcrawler/packages/stagehand`
  - Clone the [Wallcrawler](https://github.com/Volpestyle/wallcrawler) repo adjacent to this directory so these links resolve:
    - `…/web/wallcrawler` and `…/web/jobseek` should be siblings
- Key API routes
  - `POST /api/wallcrawler/search/start`: starts a search with Stagehand and returns `{ sessionId, debugUrl, jobs }`
  - `POST /api/wallcrawler/search/stream`: server-sent events stream of search progress and results
  - `GET|POST /api/wallcrawler/sessions`: lists active sessions filtered by the current user
  - `GET /api/wallcrawler/sessions/[sessionId]`: returns session details and saved results (authz enforced)
  - `POST /api/wallcrawler/search`: retrieves session status and debugger URLs (authz enforced)
- Environment variables
  - SDK: `WALLCRAWLER_API_URL`, `WALLCRAWLER_API_KEY`
  - Stagehand: `WALLCRAWLER_PROJECT_ID`, `WALLCRAWLER_API_KEY`, `ANTHROPIC_API_KEY`

This is a Next.js application with AWS infrastructure managed via AWS CDK. This repository is a pnpm workspace containing:

- `@jobseek/app`: the Next.js 15 application (app router) and API routes
- `@jobseek/cdk`: infrastructure-as-code for backend and app deployment

For deeper details (architecture, auth, deployment, rate limiting), see the documents in `docs/` linked below.

## Quick start

- Install dependencies
  ```bash
  pnpm install
  ```
- Run the app locally
  ```bash
  pnpm dev
  ```
- Lint, build, and start
  ```bash
  pnpm lint
  pnpm build
  pnpm start
  ```

Prerequisites: Node.js 20+ and pnpm installed. Environment variables and service configuration are covered in the deployment guide.

## Workspace layout

- `app/` — Next.js app and API routes
- `components/`, `hooks/`, `contexts/`, `lib/` — shared UI, hooks, context, utilities
- `cdk/` — AWS CDK project (stacks, scripts, deployment helpers)
- `docs/` — reference documentation
- `public/`, `styles` (via `app/globals.css`) — assets and global styles

## Infrastructure and deployment (CDK)

Common commands are exposed at the root for convenience and delegate to `@jobseek/cdk`:

- Synthesize and diff
  ```bash
  pnpm cdk:synth
  pnpm cdk:diff
  ```
- Deploy backend (all environments)
  ```bash
  pnpm deploy:backend:dev
  pnpm deploy:backend:staging
  pnpm deploy:backend:prod
  ```
- Deploy Next.js hosting (all environments)
  ```bash
  pnpm deploy:nextjs:dev
  pnpm deploy:nextjs:staging
  pnpm deploy:nextjs:prod
  ```

You can also run any CDK scripts directly within the `cdk/` package:

```bash
pnpm --filter @jobseek/cdk deploy:dev
pnpm --filter @jobseek/cdk deploy:staging
pnpm --filter @jobseek/cdk deploy:prod
```

Environment-specific configuration lives under `cdk/config/` (`dev.json`, `staging.json`, `prod.json`). Secrets and additional setup steps are covered in the deployment guide.

## Documentation

- Architecture overview — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Authentication architecture — [`docs/AUTH_ARCHITECTURE.md`](docs/AUTH_ARCHITECTURE.md)
- OAuth setup — [`docs/OAUTH_SETUP.md`](docs/OAUTH_SETUP.md)
- JWT token lifecycle — [`docs/jwt-token-lifecycle.md`](docs/jwt-token-lifecycle.md)
- Rate limiting — [`docs/RATE_LIMITING.md`](docs/RATE_LIMITING.md)
- Deployment guide — [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- Architecture diagram — [`docs/architecture-diagram.png`](docs/architecture-diagram.png)
