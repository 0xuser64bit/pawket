#!/usr/bin/env bash
# The web app's production environment on Vercel. From the repository root,
# after `vercel link` to the pawket project:
#   scripts/vercel-env.sh https://<production host>
# Public values are written as they are; the sponsor key goes from
# .keys/sponsor.json straight to Vercel, marked sensitive, and is never
# printed. Re-running replaces each value.
set -euo pipefail
cd "$(dirname "$0")/.."
host="${1:?usage: scripts/vercel-env.sh https://<production host>}"

put() {
  local out
  if out=$(printf '%s' "$2" | vercel env add "$1" production --force ${3:+--sensitive} 2>&1); then
    echo "  $1"
  else
    echo "  $1 FAILED: $(printf '%s' "$out" | tail -3)" >&2
    return 1
  fi
}

program=$(solana-keygen pubkey .keys/pawket-program.json)
put NEXT_PUBLIC_APP_URL "${host%/}"
put NEXT_PUBLIC_SOLANA_CLUSTER devnet
put NEXT_PUBLIC_SOLANA_RPC_URL "${NEXT_PUBLIC_SOLANA_RPC_URL:-https://api.devnet.solana.com}"
put NEXT_PUBLIC_PAWKET_PROGRAM_ID "$program"
put SPONSOR_KEYPAIR "$(cat .keys/sponsor.json)" sensitive
