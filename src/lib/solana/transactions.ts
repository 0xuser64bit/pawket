import { PAWKET_ERROR_CODES } from "./program";
import type { Signature } from "@solana/kit";

/**
 * Transaction lifecycle standard (web).
 *
 * 1. Gather state — connected wallet signer, derived PDAs, validated inputs.
 * 2. Validate client-side — game math + `normalizePetName` (trim before PDA).
 * 3. Build instruction — `getAdoptPetInstruction` / `getCareInstruction`.
 *    Never hand-roll instruction bytes in a component.
 * 4. Simulate — the Kit executor preflights by default (`skipPreflight: false`).
 *    Surface program logs; do not send a failing simulation.
 * 5. Sign — the connected wallet. Never ask for seed phrases or keypairs.
 * 6. Send — `client.sendTransaction([ix])`.
 * 7. Confirm — `confirmed` commitment, 30s timeout, then treat as unknown
 *    (not failed, not succeeded).
 * 8. Refresh — reload state from the source of truth. No optimistic XP.
 * 9. Failure — show one sentence; disable the CTA while sending.
 *
 * Rules: fee payer is the owner unless a relayer is explicitly designed.
 * Retry sends only on network drop with the same signed transaction —
 * a new blockhash means a new signature, so the user signs again.
 * Optimistic UI for adopt/care is forbidden.
 */

export const CONFIRMATION_TIMEOUT_MS = 30_000;

export type TransactionStage =
  | "idle"
  | "signing"
  | "sending"
  | "confirming"
  | "confirmed"
  | "unknown"
  | "failed";

/**
 * The `simulating` stage was removed: simulation happens inside the Kit
 * executor (resource estimation + preflight, both on by default) and cannot
 * be bracketed honestly from the outside. Stages here map 1:1 to things the
 * UI actually observes.
 */
export function isActiveStage(stage: TransactionStage): boolean {
  return stage === "signing" || stage === "sending" || stage === "confirming";
}

export function isUserRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /user rejected|rejected by user|declined/i.test(message);
}

export function isInsufficientFunds(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /insufficient (funds|lamports|balance)|not enough sol|custom program error:\s*0x1\b/i.test(
    message,
  );
}

/** Map a program error code (6000–6005) to one-sentence UX copy. */
export function pawketErrorMessage(code: number): string {
  switch (code) {
    case 6000:
      return "That name doesn't work — use 2–24 characters.";
    case 6001:
      return "Only the pet's owner can do that.";
    case 6002:
      return "That action is cooling down. Try again soon.";
    case 6003:
      return "Unknown item.";
    case 6004:
      return "That item isn't available right now.";
    case 6005:
      return "Invalid quantity.";
    default:
      return "The program rejected the transaction.";
  }
}

/** Extract a known Pawket program error code from logs/message, if present. */
export function extractProgramErrorCode(error: unknown): number | null {
  const message = error instanceof Error ? error.message : String(error);
  const contextual =
    /custom program error[^\d]*(\d+)|Error Code:\s*(\d+)|failed[^\d]*\b(600[0-5])\b/i.exec(
      message,
    );
  if (contextual) {
    const code = Number(contextual[1] ?? contextual[2] ?? contextual[3]);
    if (code >= 6000 && code <= 6005) return code;
    return null;
  }
  // Fallback for bare codes — word-boundaried so slot numbers and
  // signatures can't false-positive.
  const bare = /\b(600[0-5])\b/.exec(message);
  if (bare) return Number(bare[1]);
  return null;
}

export function toUserFacingError(error: unknown): string {
  if (isUserRejection(error)) return "You declined the signature. Nothing was sent.";
  const code = extractProgramErrorCode(error);
  if (code !== null) return pawketErrorMessage(code);
  if (isInsufficientFunds(error)) {
    return "Not enough SOL for fees. Top up and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Something went wrong sending the transaction.";
}

export { PAWKET_ERROR_CODES };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ConfirmationRpc {
  rpc: {
    getSignatureStatuses: (
      signatures: readonly Signature[],
    ) => { send: () => Promise<{ value: unknown }> };
  };
}

export type ConfirmationOutcome = "confirmed" | "unknown";

/**
 * Real confirmation wait: `sendTransaction` resolves after send, not after
 * finality. Polls signature status until confirmed/finalized, the 30s
 * timeout (then `unknown` — never `failed`), or a recorded on-chain error
 * (then throw, so the caller maps it like any send failure).
 */
// ponytail: naive 1s polling; switch to signature subscriptions if this path gets hot.
export async function waitForConfirmation(
  client: ConfirmationRpc,
  signature: string,
  timeoutMs: number = CONFIRMATION_TIMEOUT_MS,
): Promise<ConfirmationOutcome> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { value } = await client.rpc
      .getSignatureStatuses([signature as Signature])
      .send();
    const status = (Array.isArray(value) ? value[0] : null) as {
      confirmationStatus?: string;
      err?: unknown;
    } | null;
    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      if (status.err !== undefined && status.err !== null) {
        throw new Error(
          typeof status.err === "string" ? status.err : JSON.stringify(status.err),
        );
      }
      return "confirmed";
    }
    if (Date.now() >= deadline) return "unknown";
    await sleep(1000);
  }
}
