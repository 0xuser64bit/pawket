# Reporting a vulnerability

Report security issues privately to [hi@pawket.world](mailto:hi@pawket.world).
Include the affected source revision, a minimal reproduction, expected impact
and any public transaction signatures. Do not include private keys, recovery
phrases, provider credentials or screenshots of wallet recovery screens.

Use devnet or a local test environment for reproduction. Do not test against
other players or move funds to demonstrate a vulnerability. Avoid public
issues or pull requests containing exploit details until a fix is available.

The maintained implementation is the current `main` branch. Mainnet is not
released, and older APKs or commits do not establish support for the current
hosted app. Security boundaries and known limits are documented in
[docs/SECURITY.md](docs/SECURITY.md); release requirements are in
[docs/MAINNET.md](docs/MAINNET.md). Internal tests are not an external audit.
