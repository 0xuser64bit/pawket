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

Review the release diff and verification results before pushing. After a
deploy, check `/api/health`, the configured cluster, sponsor availability,
public reads and the changed player flow. A web release also changes the
Android app's hosted content; validate it in the release APK when relevant.
A program upgrade or native Android change has its own release procedure.
