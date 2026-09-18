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
| `pnpm e2e`       | Playwright smoke (starts `pnpm dev`)       |
| `pnpm verify`    | typecheck + lint + test + build            |

## Editing rules

- Pages/layouts stay Server Components. Push `"use client"` to leaves.
- One coherent purpose per commit; verify (`pnpm verify` at minimum:
  the layer command + typecheck) before moving on.
- Never commit `.env`, `.env.local`, `.next`, `coverage`, or Playwright
  output — all are gitignored.

## Deployment

Push to `main` deploys to Vercel. Production cluster/RPC come from Vercel
environment variables, never code edits. Preview deployments inherit
devnet defaults unless overridden per-environment in the dashboard.
