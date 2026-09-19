"use client";

import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useClient } from "@solana/react";
import { useState } from "react";
import { TransactionStatus } from "@/components/transaction-status";
import { getPublicEnv } from "@/config/env";
import {
  PetPersonality,
  PetSpecies,
} from "@/lib/game/enums";
import type { AppClient } from "@/lib/solana/browser-client";
import { isProgramDeployed } from "@/lib/solana/accounts";
import { explorerTxUrl } from "@/lib/solana/cluster";
import { getAdoptPetInstruction } from "@/lib/solana/instructions";
import { derivePassportPda, derivePetPda, normalizePetName } from "@/lib/solana/pda";
import { useSendTransaction } from "@/lib/solana/use-send-transaction";
import { truncateAddress } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";

/**
 * On-chain adoption: derive the pet + passport PDAs, build the instruction
 * with the single sanctioned builder, and send through the wallet. Nothing
 * is optimistic — the panel only celebrates after confirmation. When the
 * program isn't deployed on this cluster, it says so instead of failing
 * cryptically inside simulation.
 */
export function OnchainAdoptPanel() {
  const client = useClient<AppClient>();
  const mounted = useMounted();
  const connectedAccount = useConnectedWallet(client);
  // Same hydration gate as every other wallet read: server and first client
  // render agree (disconnected) before wallet state resolves.
  const connected = mounted ? connectedAccount : null;
  const env = getPublicEnv();

  const [name, setName] = useState("");
  const [species, setSpecies] = useState<PetSpecies>(PetSpecies.LunaCat);
  const [personality, setPersonality] = useState<PetPersonality>(
    PetPersonality.Curious,
  );
  const [petAddress, setPetAddress] = useState<string | null>(null);
  const { stage, signature, error, send, isSending } = useSendTransaction();

  const owner = connected ? String(connected.account.address) : null;

  // PDA preview, derived on blur so typing never fires RPC/crypto work.
  // The send path always re-derives — preview is display-only.
  async function refreshPreview(value: string) {
    if (!owner) {
      setPetAddress(null);
      return;
    }
    try {
      const pet = await derivePetPda(owner, value);
      setPetAddress(String(pet.address));
    } catch {
      setPetAddress(null);
    }
  }

  async function adoptOnchain() {
    if (!connected?.signer || !owner) return;
    const signerAddress = owner;
    const { outcome } = await send(async () => {
      const cleanName = normalizePetName(name);
      if (!(await isProgramDeployed(client, env.pawketProgramId))) {
        throw new Error(
          `The Pawket program isn't deployed on ${env.solanaCluster} yet — your guest companion above is the way to play today.`,
        );
      }
      const pet = await derivePetPda(signerAddress, cleanName);
      const passport = await derivePassportPda(pet.address);
      return getAdoptPetInstruction({
        owner: address(signerAddress),
        pet: pet.address,
        passport: passport.address,
        name: cleanName,
        species,
        personality,
      });
    });
    if (outcome === "confirmed") setName("");
  }

  return (
    <section
      aria-label="On-chain adoption"
      className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
        On-chain · devnet
      </p>
      <h2 className="text-xl font-bold text-slate-100">
        Adopt on Solana
      </h2>
      <p className="text-sm text-slate-400">
        {connected
          ? "Derives your pet and passport addresses, then asks your wallet to sign exactly once."
          : "Connect a wallet above to adopt on-chain. Your guest companion needs nothing."}
      </p>

      <div className="space-y-2">
        <label htmlFor="onchain-name" className="text-sm font-semibold text-slate-200">
          Pet name
        </label>
        <input
          id="onchain-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={(event) => void refreshPreview(event.target.value)}
          placeholder="e.g. Mochi"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          disabled={isSending}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-amber-300/60 focus:outline-none focus:ring-1 focus:ring-amber-300/60 disabled:opacity-50"
        />
        {petAddress ? (
          <p className="font-mono text-xs text-slate-400">
            Pet address preview:{" "}
            <span className="text-slate-200" title={petAddress}>
              {truncateAddress(petAddress, 6)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-sm text-slate-300">
          Species
          <select
            value={species}
            disabled={isSending}
            onChange={(event) => setSpecies(event.target.value as PetSpecies)}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50"
          >
            <option value={PetSpecies.LunaCat}>Luna cat</option>
            <option value={PetSpecies.MossPup}>Moss pup</option>
            <option value={PetSpecies.CloudBun}>Cloud bun</option>
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-300">
          Personality
          <select
            value={personality}
            disabled={isSending}
            onChange={(event) => setPersonality(event.target.value as PetPersonality)}
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-50"
          >
            <option value={PetPersonality.Curious}>Curious</option>
            <option value={PetPersonality.Cozy}>Cozy</option>
            <option value={PetPersonality.Brave}>Brave</option>
            <option value={PetPersonality.Mischief}>Mischief</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void adoptOnchain()}
        disabled={!connected?.signer || isSending || !name.trim()}
        className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSending ? "Waiting for wallet…" : "Adopt on-chain"}
      </button>

      <TransactionStatus
        stage={stage}
        signature={signature}
        error={error}
        explorerUrl={signature ? explorerTxUrl(signature, env.solanaCluster) : null}
      />
    </section>
  );
}
