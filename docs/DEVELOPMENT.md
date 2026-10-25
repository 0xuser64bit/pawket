# Development and deployment

## Setup

Use Node from `.nvmrc` and pnpm pinned by `packageManager` in `package.json`.
`engines` records all supported Node ranges; Node 20 cannot run the installed
Vitest and jsdom versions.

```sh
nvm use
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

The local app opens at `http://localhost:3000`. Guest play needs no key.
`ENVIRONMENT.md` describes Solana RPC and devnet sponsorship configuration.
Do not replace an existing local env file or commit secrets.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | Next.js and TypeScript ESLint rules, including the Meteora import boundary |
| `pnpm typecheck` | Strict TypeScript, including unused locals and parameters |
| `pnpm test` / `pnpm test:watch` | Unit and component tests; Vitest config is `vitest.config.mts` |
| `pnpm e2e` | Playwright browser suite; `PLAYWRIGHT_PORT` selects the local port; with `CI=1`, uses the production build (run `pnpm verify` first) |
| `pnpm verify` | Typecheck, lint, unit tests and production build |
| `pnpm assets:3d` | Rebuild and validate the shipped GLBs |
| `pnpm program:build` | Anchor SBF v2 build and committed IDL sync |
| `pnpm program:test` | Program build and LiteSVM suite |
| `pnpm e2e:devnet` | Program/sponsor integration against deployed devnet |
| `pnpm e2e:coins` | Meteora coin lifecycle on devnet |

Program tooling is pinned in `rust-toolchain.toml`, `Cargo.toml` and
`Anchor.toml`; it also needs Anchor and the Solana CLI. `SOLANA.md` covers
program deployment. Android setup, build and release commands are in `ANDROID.md`.
`TESTING.md` explains the opt-in network tests and their effects.

For an import/dependency audit, run `pnpm dlx knip@6.41.0`. `knip.json` treats
the documented operational scripts as entry points and Anchor as an external
tool. Review production, test, migration and dynamic references before deleting
a reported symbol; a protocol compatibility builder is not dead UI code.

## Change discipline

Read [AGENTS.md](../AGENTS.md), `WORKFLOW.md` and the owning system document. Follow existing
modules, preserve storage migrations and public redirects, and update callers
when an interface changes. Keep one purpose per commit and complete the owning
checks plus `pnpm verify` before declaring the work done.

For Next.js changes, read the installed guides in `node_modules/next/dist/docs/`;
the repository's installed version governs the API. Interactive leaves use
`"use client"`; routes and layouts default to Server Components.

## Hosted deployment

The configured production origin is `https://pawket.world`. The maintained
deployment uses the `pawket` Vercel project and its `main` integration. A fork
needs its own deployment project and domain configuration. Public env values are
embedded during the build. `scripts/vercel-env.sh` manages production config
and marks the sponsor key sensitive. Preview builds default to devnet and have
no sponsor unless configured.

### Development and releases

Work on `dev`; Vercel assigns that branch's Preview deployments to
`https://dev.pawket.world`. Pushes to this branch update the development site.
Development pull requests target `dev`. A release is a pull request from `dev`
to `main`, merged only with the user's explicit authorization; `main`'s ruleset
requires the web, program, android, audit and secrets checks. The hackathon
submission (commit `9748288`) stays at its own deployment,
`https://pawket-g9a4tvamv-init-0ne.vercel.app`, behind Vercel's login.

The `dev` branch's Preview configuration sets `NEXT_PUBLIC_APP_URL` to the
development origin and uses public devnet RPC. Sponsorship is not configured
for this preview; rent-bearing actions wait for sponsorship. Do not run the
production-only `scripts/vercel-env.sh` to configure this branch.

The two sites have separate browser storage and device keys, but share the
same devnet program and its chain records. A program upgrade would affect
both sites and needs its own explicit authorization and deployment plan.
Use a separate test wallet: linking the development site's device replaces
that owner's existing device link, and chain actions change shared records.
The released Android app continues to open the production origin.

Review the release diff and verification results before pushing. After a
deploy, check `/api/health`, the configured cluster, sponsor availability,
public reads and the changed player flow. A web release also changes the
Android app's hosted content; validate it in the release APK when relevant.
A program upgrade or native Android change has its own release procedure.

## Watching it run

`/api/health` answers whether the server's Solana RPC responds and how fast,
whether the sponsor is paying, and which commit is deployed; it never shows a
secret, a balance or a provider URL. Server errors log one JSON line
(`"pawket":"server-error"`, from `instrumentation.ts`), a screen that broke in
a browser logs `"pawket":"client-error"` through `/api/report` while its player
is counted, and sponsor failures log `"pawket":"sponsor"`; each message is
scrubbed of URLs and addresses (`src/lib/analytics/scrub.ts`). Search a
deployment's runtime logs for those keys. The `Watch` workflow
(`.github/workflows/watch.yml`) checks pawket.world's health and that the
sponsor holds more than 2 SOL every four hours, and a failed run notifies the
repository's owner; GitHub runs it only from the default branch.
