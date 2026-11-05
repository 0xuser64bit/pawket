import type { Address } from "@solana/kit";
import type { CareActionType } from "@/lib/game/enums";
import type { GuestPet } from "@/lib/guest/pet";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import type { SendResult } from "@/lib/solana/send";
import type { TxState } from "@/lib/solana/use-send";
import { readDeadline } from "@/lib/utils/deadline";
import type { OwnedPetsRefresh } from "./use-companion";

export interface RecordedCare {
  before: GuestPet;
  after: GuestPet;
  action: CareActionType;
  guild: boolean;
}
type Stage = "sending" | "unknown" | "reading" | "ready" | "retry";
export interface CareState { stage: Stage }
interface PendingCare {
  before: PetOnChain;
  action: CareActionType;
  stage: Stage;
  signature?: string;
  after?: PetOnChain;
  readAbort?: ReturnType<typeof readDeadline>;
  onRecorded: (care: RecordedCare) => void;
  refresh: (signal: AbortSignal) => Promise<OwnedPetsRefresh>;
}

function reflectsCare(before: PetOnChain, after: PetOnChain, action: CareActionType) {
  return after.pet.address === before.pet.address && after.pet.owner === before.pet.owner &&
    after.passport.pet === after.pet.address && after.passport.owner === before.pet.owner &&
    after.pet.lastCareAt[action] > before.pet.lastCareAt[action] &&
    after.passport.careCount > before.passport.careCount && after.pet.xp >= before.pet.xp;
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error("Read cancelled."));
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** One mounted owner's pet; a receipt confirms independently of the record on screen. */
export class ChainCare {
  private live = false;
  private pending: PendingCare | null = null;
  private state: CareState | null = null;
  private listeners = new Set<() => void>();

  constructor(private owner: Address | null, private petAddress: Address | undefined) {}

  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  activate() {
    this.live = true;
    return () => {
      this.live = false;
      const pending = this.pending;
      this.pending = null;
      this.publish(null);
      pending?.readAbort?.abort();
    };
  }
  private publish(stage: Stage | null) {
    this.state = stage ? { stage } : null;
    for (const listener of this.listeners) listener();
  }

  private async read(pending: PendingCare) {
    if (!this.live || this.pending !== pending || pending.readAbort) return;
    const controller = readDeadline(15_000);
    pending.readAbort = controller;
    pending.stage = "reading";
    this.publish("reading");
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await withAbort(pending.refresh(controller.signal), controller.signal);
        if (!this.live || this.pending !== pending) return;
        const after = result.status === "success" && result.owner === pending.before.pet.owner
          ? result.pets.find((pet) => reflectsCare(pending.before, pet, pending.action)) : undefined;
        if (after) {
          pending.after = after;
          pending.stage = "ready";
          this.publish("ready");
          return;
        }
        if (attempt < 2) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await withAbort(new Promise<void>((resolve) => { timer = setTimeout(resolve, 1_000); }), controller.signal);
          } finally { clearTimeout(timer); }
        }
      }
    } catch {
      // A confirmed send needs another read, never another transaction.
    } finally {
      controller.abort();
      pending.readAbort = undefined;
      if (this.live && this.pending === pending && pending.stage !== "ready") {
        pending.stage = "retry";
        this.publish("retry");
      }
    }
  }

  observe(active: PetOnChain | null, tx?: TxState) {
    const pending = this.pending;
    if (!this.live || !pending) return;
    if (pending.stage === "unknown" && tx && pending.signature === tx.signature) {
      if (tx.stage === "confirmed") void this.read(pending);
      else if (tx.stage === "failed") {
        this.pending = null;
        this.publish(null);
      }
    }
    if (pending.stage === "ready" && pending.after && active &&
      reflectsCare(pending.before, active, pending.action) &&
      active.pet.lastCareAt[pending.action] >= pending.after.pet.lastCareAt[pending.action] &&
      active.pet.xp >= pending.after.pet.xp && active.passport.careCount >= pending.after.passport.careCount) {
      // Clear first: rerenders and late receipt updates cannot replay this moment.
      this.pending = null;
      this.publish(null);
      pending.onRecorded({ before: toCompanionRecord(pending.before), after: toCompanionRecord(active), action: pending.action, guild: Boolean(active.member) });
    }
  }

  async start(input: Pick<PendingCare, "before" | "action" | "refresh" | "onRecorded">, send: () => Promise<SendResult | null>) {
    if (!this.live || this.pending || !this.owner || input.before.pet.owner !== this.owner || input.before.pet.address !== this.petAddress) return;
    const pending: PendingCare = { ...input, stage: "sending" };
    this.pending = pending;
    this.publish("sending");
    const result = await send();
    if (!this.live || this.pending !== pending) return;
    if (!result) {
      this.pending = null;
      this.publish(null);
      return;
    }
    pending.signature = result.signature;
    if (result.outcome === "confirmed") await this.read(pending);
    else {
      pending.stage = "unknown";
      this.publish("unknown");
    }
  }
  async retry() {
    if (this.pending?.stage === "retry") await this.read(this.pending);
  }
}
