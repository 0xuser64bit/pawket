# Development and deployment

Get the web app running first. Program builds, Android tooling and devnet
signing are separate workflows; none is needed to adopt and care locally.

[Documentation](README.md) · [Environment](ENVIRONMENT.md) ·
[Testing](TESTING.md) · [Contribution workflow](WORKFLOW.md)

## Setup

Use Node from `.nvmrc` and pnpm pinned by `packageManager` in `package.json`.
`engines` records all supported Node ranges; Node 20 cannot run the installed
Vitest and jsdom versions.

```sh
nvm install
nvm use
npm install --global pnpm@10.34.6
cp -n .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Run these commands from the repository root after cloning. `nvm` is optional:
another Node manager is fine if it selects the version in `.nvmrc`. If pnpm
is already installed, check `pnpm --version` against `packageManager` instead
of reinstalling it. The copy command leaves existing env files untouched;
compare new example settings manually when updating a checkout.

Open [localhost:3000](http://localhost:3000). Adopt a pet, take them home,
choose **Feed** and reload: the same local pet and saved care should remain.
**Playground** and **Profile** work without signing. Public pages read
devnet and may report an unavailable RPC; that does not mean local setup failed.

The [environment guide](ENVIRONMENT.md) explains each setting. Do not copy
production secrets to get local play working. Work on `dev` and target it
with development pull requests; see [release boundaries](#development-and-releases).

### Pick the workflow you need

| Work | Additional prerequisites | Next guide |
| --- | --- | --- |
| Web UI, local pets, games or docs | Node and pnpm only | [Change workflow](WORKFLOW.md) |
| Browser verification | Playwright Chromium: `pnpm exec playwright install chromium` | [Testing](TESTING.md) |
| Solana account reads | A working devnet RPC; public defaults are provided | [Environment](ENVIRONMENT.md) |
| App signing on devnet | Compatible owner wallet, device link, test SOL where spent, and sponsorship for rent-bearing actions | [Player setup](PLAYING.md#choose-solana-if-you-want-to), [Solana](SOLANA.md) |
| Program development | Rust, Anchor and Solana toolchain | [Solana](SOLANA.md) |
| Native shell | JDK and Android SDK | [Android](ANDROID.md) |

No `.env.local` secret is needed by the default web verification suite.
Opt-in devnet suites create real test-network accounts and spend test SOL;
read their prerequisites before running them.

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
`Anchor.toml`; [Solana](SOLANA.md) covers its setup and deployment. Android
setup, build and release commands are in [Android](ANDROID.md).

For an import/dependency audit, run `pnpm dlx knip@6.41.0`. `knip.json` treats
the documented operational scripts as entry points and Anchor as an external
tool. Review production, test, migration and dynamic references before deleting
a reported symbol; a protocol compatibility builder is not dead UI code.

## Change discipline

Follow [AGENTS.md](../AGENTS.md), the [change workflow](WORKFLOW.md) and the
owning system guide. The workflow owns the definition of done; the
[testing guide](TESTING.md) owns which additional checks a change needs.

For Next.js changes, read the installed guides in `node_modules/next/dist/docs/`;
the repository's installed version governs the API. Interactive leaves use
`"use client"`; routes and layouts default to Server Components.

## Troubleshooting local setup

| Symptom | Check |
| --- | --- |
| `pnpm: command not found` | Install the pinned package manager with the setup command above; reopen the shell if its global bin directory was not on `PATH`. |
| A Node engine or test-tool error | Select `.nvmrc`; do not remove the engine constraint or update the lockfile to work around an older Node. |
| Port 3000 is in use | Run `pnpm dev --port 3100` and open that port. Set `NEXT_PUBLIC_APP_URL` to that origin if testing generated links or metadata. |
| Missing Playwright executable | Run `pnpm exec playwright install chromium`; Linux CI may also need `--with-deps`. |
| Public pages or health are degraded | Check RPC access and the cluster settings. `/api/health` distinguishes RPC status from sponsor availability; no configured sponsor is normal locally. |
| Sponsorship is unavailable | Local play still works. Do not fund a real wallet to bypass a devnet test setup; use the explicit prerequisites in [Solana](SOLANA.md). |
| Another port has no local pets | Browser storage is origin-scoped, including the port. Restore a pet copy if you meant to move it. |
| 3D is unavailable | Choose 2D; WebGL support is separate from pet state. Use [room troubleshooting](ROOM-3D.md) for asset/runtime work. |

For a production-mode reproduction:

```sh
pnpm build
pnpm start --port 3100
# In another terminal; use a free port with no existing server for CI mode:
CI=1 PLAYWRIGHT_PORT=3200 pnpm e2e --workers=2
```

Playwright starts its own server. `CI=1` selects `pnpm start` and refuses to
reuse an existing one; without `CI`, it starts or reuses `pnpm dev`.

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
to `main`, merged only with the user's explicit authorization. The release
gate is the web, program, android, audit and secrets checks; confirm that the
repository's live ruleset requires them before merging. Historical
submission builds are not the maintained development or production site.

Configure the `dev` branch's Preview environment with `NEXT_PUBLIC_APP_URL`
set to the development origin and devnet RPC. Sponsorship is optional and
must be checked at runtime; when it is unavailable, rent-bearing device
actions wait. Do not run the production-only `scripts/vercel-env.sh` to
configure this branch. Hosted environment values and branch protections
must be checked in the deployment provider and repository settings; source
files alone cannot establish their live state.

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
deployment's runtime logs for those keys. Unexpected coin API failures log
`"pawket":"coin-error"` with the operation, scrubbed cause and elapsed time;
the public response stays generic. The `Watch` workflow
(`.github/workflows/watch.yml`) checks pawket.world's health and that the
sponsor holds more than 2 SOL every four hours, and a failed run notifies the
repository's owner; GitHub runs it only from the default branch.
