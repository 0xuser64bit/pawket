# Contributing to Pawket

Read the [product](docs/PRODUCT.md), [architecture](docs/ARCHITECTURE.md) and
[change workflow](docs/WORKFLOW.md) before editing. [AGENTS.md](AGENTS.md) maps
each fact to its source and applies to human and automated changes.

Use the Node version in `.nvmrc` and pnpm pinned in `package.json`. Follow the
[development guide](docs/DEVELOPMENT.md) for setup. Guest play and the default
verification suite need no wallet or secrets.

For a bug, include the source revision, browser or Android/WebView version,
steps to reproduce and expected behavior. For a feature, explain the player
need and check existing [decisions](docs/DECISIONS.md) before proposing another
system. Report vulnerabilities through [SECURITY.md](SECURITY.md).

Keep pull requests focused. Explain the resulting behavior, checks run and
remaining verification gaps. Preserve storage migrations, public redirects,
accessibility and error recovery. Update the owning doc when a contract
changes; avoid adding task logs or duplicate specifications.

```sh
pnpm verify
pnpm e2e
gitleaks git --redact --log-opts=--all .
```

[TESTING.md](docs/TESTING.md) defines additional checks for program, asset and
Android changes. Devnet integration suites create accounts and spend test SOL;
they are opt-in. Do not repoint them at mainnet. Never commit env files,
keypairs, signing keystores, generated builds or private release evidence.

Contributions are licensed under the [MIT license](LICENSE). Preserve the
separate licenses and notices for bundled assets in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
