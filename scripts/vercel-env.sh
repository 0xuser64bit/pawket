#!/usr/bin/env bash
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

put NEXT_PUBLIC_APP_URL "${host%/}"
put NEXT_PUBLIC_SOLANA_CLUSTER devnet
default_rpc=$([ -n "${SOLANA_RPC_URL:-}" ] && echo /api/rpc || echo https://api.devnet.solana.com)
put NEXT_PUBLIC_SOLANA_RPC_URL "${NEXT_PUBLIC_SOLANA_RPC_URL:-$default_rpc}"
put SPONSOR_KEYPAIR "$(cat .keys/sponsor.json)" sensitive
if [ -n "${SOLANA_RPC_URL:-}" ]; then put SOLANA_RPC_URL "$SOLANA_RPC_URL" sensitive; fi
if [ -n "${DERIVATION_SECRET:-}" ]; then put DERIVATION_SECRET "$DERIVATION_SECRET" sensitive; fi
if [ -n "${COLLECTION_AUTHORITY_KEYPAIR:-}" ]; then put COLLECTION_AUTHORITY_KEYPAIR "$COLLECTION_AUTHORITY_KEYPAIR" sensitive; fi
