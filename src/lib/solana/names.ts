import { MAX_NAME_BYTES, MIN_NAME_BYTES } from "./program";

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
