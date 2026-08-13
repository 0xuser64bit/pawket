# Contributing

Setup: [docs/SETUP.md](docs/SETUP.md)

How to change code: [AGENTS.md](./AGENTS.md)

- TypeScript packages use Prettier + ESLint + Vitest.
- Game rules live in `packages/shared`. Do not reimplement them in a screen or route.
- The live pet loop is the API. The Solana program is not the live path yet.
- Run `pnpm verify` before you consider a change done.
- If you change `programs/pawket/programs/pawket/src/lib.rs`, rebuild, `pnpm idl:sync`, update the SDK, and run `anchor test`.
