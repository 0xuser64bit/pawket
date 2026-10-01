import { MAX_NAME_BYTES, MIN_NAME_BYTES } from "./program";

/**
 * The name rule shared with PDA derivation. This module does not import
 * the Solana client, so the browser companion can validate a name without
 * loading the wallet stack.
 */
export class SolanaValidationError extends Error {
  readonly code = "SOLANA_VALIDATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "SolanaValidationError";
  }
}

const utf8 = new TextEncoder();

function byteLength(value: string): number {
  return utf8.encode(value).length;
}

/** Trim + validate an on-chain name (2–24 UTF-8 bytes) before derivation. */
export function normalizePetName(name: string): string {
  const trimmed = name.trim();
  const length = byteLength(trimmed);
  if (length < MIN_NAME_BYTES || length > MAX_NAME_BYTES) {
    throw new SolanaValidationError(
      `Pet name must be ${MIN_NAME_BYTES}–${MAX_NAME_BYTES} UTF-8 bytes.`,
    );
  }
  return trimmed;
}
