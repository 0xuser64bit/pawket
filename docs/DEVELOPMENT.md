# Development

Requires Node 20+ and pnpm 9+.

```sh
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

## Commands

| Command          | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Local dev server                           |
| `pnpm build`     | Production build (`next build`)            |
| `pnpm start`     | Serve the production build                 |
| `pnpm lint`      | ESLint (Next core-web-vitals + TypeScript) |
| `pnpm typecheck` | `tsc --noEmit`                             |
| `pnpm test`      | Vitest unit/component tests                |
| `pnpm test:watch`| Vitest in watch mode                       |
| `pnpm e2e`       | Playwright (starts `pnpm dev`; `PLAYWRIGHT_PORT` overrides 3000) |
| `pnpm verify`    | typecheck + lint + test + build            |
| `pnpm program:test` | anchor build (SBF v2) + LiteSVM tests   |
| `pnpm e2e:devnet` | the chain path against the deployed program |

## Editing rules

- Pages/layouts stay Server Components. Push `"use client"` to leaves.
- One coherent purpose per commit; verify (`pnpm verify` at minimum:
  the layer command + typecheck) before moving on.
- Never commit `.env`, `.env.local`, `.next`, `coverage`, or Playwright
  output — all are gitignored.

## Deployment

Push to `main` deploys to Vercel (project `pawket`, live at
https://pawket-pets.vercel.app). Production cluster, RPC, program ID and the
sponsor key come from Vercel environment variables written by
`scripts/vercel-env.sh`, never code edits. Preview deployments inherit
devnet defaults and have no sponsor unless one is added for them.

The program deploys separately (`docs/SOLANA.md`). Its toolchain: Anchor
1.2 (`avm`), Rust 1.89 (`rust-toolchain.toml`), Solana CLI 3.x.
