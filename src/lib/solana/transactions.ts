import {
  isSolanaError,
  SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
  SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND,
  SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE,
  type Signature,
} from "@solana/kit";

export const CONFIRMATION_TIMEOUT_MS = 30_000;

export type TransactionStage =
  | "idle"
  | "preparing"
  | "signing"
  | "sending"
  | "confirming"
  | "confirmed"
  | "unknown"
  | "failed";

export function isActiveStage(stage: TransactionStage): boolean {
  return stage === "preparing" || stage === "signing" || stage === "sending" || stage === "confirming";
}

function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  for (let e = error, depth = 0; e != null && depth < 6; depth++) {
    chain.push(e);
    e = typeof e === "object" ? (e as { cause?: unknown }).cause : undefined;
  }
  return chain;
}

function messageOf(error: unknown): string {
  return errorChain(error)
    .map((e) => (e instanceof Error ? e.message : typeof e === "string" ? e : ""))
    .filter(Boolean)
    .join(" | ");
}

export function mobileWalletErrorCode(error: unknown): string | number | null {
  for (const e of errorChain(error)) {
    const { name, code } = (e ?? {}) as { name?: unknown; code?: unknown };
    if (name !== "SolanaMobileWalletAdapterError" && name !== "SolanaMobileWalletAdapterProtocolError") continue;
    if (typeof code === "string" || typeof code === "number") return code;
  }
  return null;
}

const MOBILE_REFUSALS = new Set<string | number>([-1, -3, "ERROR_ASSOCIATION_CANCELLED"]);

export function isUserRejection(error: unknown): boolean {
  const code = mobileWalletErrorCode(error);
  if (code !== null && MOBILE_REFUSALS.has(code) && !/timed? out|timeout/i.test(messageOf(error))) return true;
  return /user rejected|rejected by user|declined|user denied|cancell?ed by user/i.test(messageOf(error));
}

export function mobileWalletProblem(error: unknown): string | null {
  switch (mobileWalletErrorCode(error)) {
    case "ERROR_WALLET_NOT_FOUND":
      return "No wallet app on this phone answered. Install one — Phantom, Solflare or Backpack — then try again.";
    case "ERROR_SESSION_CLOSED":
      return "Your wallet closed before it answered.";
    case "ERROR_SESSION_TIMEOUT":
      return "Your wallet did not answer in time.";
    case "ERROR_REAUTHORIZE":
      return "Your wallet app wanted to approve Pawket again before signing. Try once more: it asks, then signs.";
    case "ERROR_ASSOCIATION_CANCELLED":
      return /timed? out|timeout/i.test(messageOf(error)) ? "Your wallet app did not open in time." : null;
    case "ERROR_LOOPBACK_ACCESS_BLOCKED":
      return "This browser is not letting Pawket reach your wallet app. Allow local network access for this site, then try again.";
    default:
      return null;
  }
}

export function isInsufficientFunds(error: unknown): boolean {
  if (errorChain(error).some((e) => isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__INSUFFICIENT_FUNDS_FOR_FEE))) {
    return true;
  }
  return /insufficient (funds|lamports|balance)|not enough sol|custom program error:\s*0x1\b/i.test(
    messageOf(error),
  );
}

const MIN_CODE = 6000;
const MAX_CODE = 6029;
const isPawketCode = (code: unknown): code is number =>
  typeof code === "number" && Number.isInteger(code) && code >= MIN_CODE && code <= MAX_CODE;

export function pawketErrorMessage(code: number): string {
  switch (code) {
    case 6000:
      return "A name needs 2 to 24 characters. Nothing was recorded.";
    case 6001:
      return "Only this pet's owner can do that. Nothing changed.";
    case 6002:
      return "That care is still cooling down. Nothing changed.";
    case 6003:
      return "That is not in the wardrobe. Nothing changed.";
    case 6004:
      return "A guild's name needs at least three letters or numbers. No guild was founded.";
    case 6005:
      return "A guild's name is 3 to 32 characters. No guild was founded.";
    case 6006:
      return "A motto is at most 80 characters. No guild was founded.";
    case 6007:
      return "There is no crest like that. No guild was founded.";
    case 6008:
      return "An amount has to be more than nothing. Nothing moved.";
    case 6009:
      return "Your Pawket Wallet does not hold that much. Nothing moved.";
    case 6010:
      return "A device is linked for up to 30 days and 500 actions a day. Nothing changed.";
    case 6011:
      return "This device is not the one linked to your Pawket Wallet. Nothing changed.";
    case 6012:
      return "This device's link has run out. Link it again to keep going. Nothing changed.";
    case 6013:
      return "This device has done all it may today. Nothing changed; it can again after midnight UTC.";
    case 6014:
      return "No device is linked to your Pawket Wallet. Nothing changed.";
    case 6015:
      return "Unlink the device before closing your Pawket Wallet. Nothing moved.";
    case 6016:
      return "The Market sells nothing like that. Nothing was bought.";
    case 6017:
      return "Your closet holds that already. Nothing was bought, and nothing was charged.";
    case 6018:
      return "That piece is not in your closet yet. Nothing changed.";
    case 6019:
      return "An event needs a 3 to 48 character title, and to end after it starts, within 7 days and within 60 days from now. No event was planned.";
    case 6020:
      return "Only the guild's founder can do that. Nothing changed.";
    case 6021:
      return "That pet is not in this guild. Nothing changed.";
    case 6022:
      return "That event is over. Nothing changed.";
    case 6023:
      return "Check-in opens 15 minutes before the event and closes when it ends. Nothing changed.";
    case 6024:
      return "That pet has checked in already. Nothing changed.";
    case 6025:
      return "A poll asks 3 to 80 characters, with 2 to 4 options of up to 24, open 10 minutes to 14 days. No poll was opened.";
    case 6026:
      return "That poll has closed. No vote was counted.";
    case 6027:
      return "That poll has no such option. No vote was counted.";
    case 6028:
      return "That is your own pet — wave at someone else's. Nothing changed.";
    case 6029:
      return "You waved at this pet today already. It is in their guestbook.";
    default:
      return "The program refused it. Nothing changed.";
  }
}

export function extractProgramErrorCode(error: unknown): number | null {
  for (const e of errorChain(error)) {
    if (isSolanaError(e, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) {
      return isPawketCode(e.context.code) ? e.context.code : null;
    }
    const relayed = typeof e === "object" ? (e as { programError?: unknown }).programError : undefined;
    if (typeof relayed === "number") return isPawketCode(relayed) ? relayed : null;
  }
  const message = messageOf(error);
  const hex = /custom program error:\s*0x([0-9a-f]+)/i.exec(message);
  if (hex) {
    const code = parseInt(hex[1], 16);
    return isPawketCode(code) ? code : null;
  }
  const contextual = /custom program error:?\s*#?(\d+)|Error Number:\s*(\d+)|Error Code:\s*(\d+)/i.exec(message);
  if (contextual) {
    const code = Number(contextual[1] ?? contextual[2] ?? contextual[3]);
    return isPawketCode(code) ? code : null;
  }
  const bare = /\b(600[0-7])\b/.exec(message);
  return bare ? Number(bare[1]) : null;
}

export function toUserFacingError(error: unknown): string {
  if (isUserRejection(error)) return "You declined the signature. Nothing was sent.";
  const mobile = mobileWalletProblem(error);
  if (mobile) return `${mobile} Nothing was sent.`;
  const code = extractProgramErrorCode(error);
  if (code !== null) return pawketErrorMessage(code);
  if (isInsufficientFunds(error)) {
    return "Not enough SOL in your wallet for this. Nothing was sent.";
  }
  if (/already in use/i.test(messageOf(error))) {
    return "That is already on Solana — a pet in a guild, or a guild with that name. Nothing changed.";
  }
  if (errorChain(error).some((e) =>
    isSolanaError(e, SOLANA_ERROR__TRANSACTION_ERROR__BLOCKHASH_NOT_FOUND) ||
    isSolanaError(e, SOLANA_ERROR__BLOCK_HEIGHT_EXCEEDED),
  ) || /blockhash not found|block height exceeded/i.test(messageOf(error))) {
    return "That waited too long to be signed and expired. Nothing was sent — try again.";
  }
  if (errorChain(error).some((e) => isSolanaError(e, SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE))) {
    return "Solana refused this transaction before it was sent. Nothing changed — try again.";
  }
  if (/failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected/i.test(messageOf(error))) {
    return "Pawket could not reach Solana just now. Nothing was sent — try again once you are online.";
  }
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Something went wrong sending the transaction. Nothing changed.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ConfirmationRpc {
  rpc: {
    getSignatureStatuses: (
      signatures: readonly Signature[],
    ) => { send: (options?: { abortSignal?: AbortSignal }) => Promise<{ value: unknown }> };
  };
}

export type ConfirmationOutcome = "confirmed" | "unknown";

export async function waitForConfirmation(
  client: ConfirmationRpc,
  signature: string,
  timeoutMs: number = CONFIRMATION_TIMEOUT_MS,
): Promise<ConfirmationOutcome> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { value } = await client.rpc
      .getSignatureStatuses([signature as Signature])
      .send({ abortSignal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) })
      .catch(() => ({ value: null }));
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
        const custom = (status.err as { InstructionError?: [unknown, { Custom?: unknown } | string] }).InstructionError?.[1];
        const code = typeof custom === "object" && custom ? Number(custom.Custom) : NaN;
        throw Object.assign(
          new Error(typeof status.err === "string" ? status.err : JSON.stringify(status.err, (_key, value) => (typeof value === "bigint" ? Number(value) : value))),
          Number.isInteger(code) ? { programError: code } : {},
        );
      }
      return "confirmed";
    }
    if (Date.now() >= deadline) return "unknown";
    await sleep(1000);
  }
}

interface SettleRpc {
  rpc: ConfirmationRpc["rpc"] & {
    isBlockhashValid: (blockhash: never, config?: { commitment?: "processed" | "confirmed" | "finalized" }) => {
      send: (options?: { abortSignal?: AbortSignal }) => Promise<{ value: boolean }>;
    };
  };
}

export type Settled = "confirmed" | "expired" | "unknown";

export async function settleSignature(client: SettleRpc, signature: string, blockhash: string, timeoutMs = 120_000): Promise<Settled> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if ((await waitForConfirmation(client, signature, 0)) === "confirmed") return "confirmed";
    const valid = await client.rpc
      .isBlockhashValid(blockhash as never, { commitment: "processed" })
      .send({ abortSignal: AbortSignal.timeout(10_000) })
      .then(({ value }) => value, () => true);
    if (!valid) return (await waitForConfirmation(client, signature, 0)) === "confirmed" ? "confirmed" : "expired";
    if (Date.now() >= deadline) return "unknown";
    await sleep(3000);
  }
}
