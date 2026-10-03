"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, PetArt, Stack, Waiting } from "@/components/pk";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { getJoinGuildInstruction, getLeaveGuildInstruction } from "@/lib/solana/instructions";
import { deriveMemberPda } from "@/lib/solana/pda";
import { usePawketSend, useSponsor } from "@/lib/solana/use-send";

/**
 * Your pets and this guild: each pet on Solana that could join, one that is
 * in it and could leave, one that is in another guild. Joining and leaving
 * are signed by the pet's owner; Pawket pays the fee while it can. The page
 * is read again from Solana once a send is confirmed.
 */
export function GuildMembership({ guild }: { guild: { address: string; name: string } }) {
  const companion = useCompanion();
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const cluster = getPublicEnv().solanaCluster;

  async function join(entry: PetOnChain) {
    const member = (await deriveMemberPda(entry.pet.address)).address;
    const result = await sender.send(`${entry.pet.name} joins ${guild.name}`, ({ owner, payer }) => [
      getJoinGuildInstruction({ owner, payer, pet: entry.pet.address, guild: guild.address, member }),
    ]);
    if (result) {
      companion.refresh();
      router.refresh();
    }
  }

  async function leave(entry: PetOnChain) {
    if (!entry.member) return;
    const { member } = entry;
    const result = await sender.send(`${entry.pet.name} leaves ${guild.name}`, ({ owner }) => [
      getLeaveGuildInstruction({ owner, pet: entry.pet.address, member: member.address, guild: member.guild, payer: member.payer }),
    ]);
    if (result) {
      companion.refresh();
      router.refresh();
    }
  }

  if (!companion.ready) return <Waiting label="Reading your pets" />;

  return (
    <Card>
      <h2 className="title">Your pets and {guild.name}</h2>
      {!companion.owner ? (
        <>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            A guild is kept on Solana, so a pet joins it from the wallet that keeps it. Connecting signs nothing.
          </p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
          </div>
        </>
      ) : companion.owned.length === 0 ? (
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
          This wallet keeps no pet on Solana yet. Keep one there from Home — the pets in this browser can follow — and
          it can join.
        </p>
      ) : (
        <Stack gap={3} style={{ marginTop: "var(--space-4)" }}>
          {companion.owned.map((entry) => {
            const here = entry.member?.guild === guild.address;
            const elsewhere = entry.member !== null && !here;
            return (
              <div key={entry.pet.address} className="pk-member-row">
                <span className="pk-avatar" aria-hidden="true">
                  <PetArt {...petLook(toCompanionRecord(entry))} still />
                </span>
                <span className="pk-fill">
                  <span className="title">{entry.pet.name}</span>
                  <span className="caption pk-faint" style={{ display: "block" }}>
                    {here ? `In ${guild.name}` : elsewhere ? "In another guild" : "In no guild"}
                  </span>
                </span>
                {here ? (
                  <Button label="Leave" tone="quiet" size="sm" disabled={sender.busy} onClick={() => void leave(entry)} />
                ) : elsewhere ? null : (
                  <Button label="Join" tone="bloom" size="sm" icon="guild" disabled={sender.busy || !companion.canSign} onClick={() => void join(entry)} />
                )}
              </div>
            );
          })}
          <p className="caption pk-faint">
            One guild per pet. {sponsor.data?.available ? "Pawket pays the fee and the small rent, and gets the rent back if the pet leaves." : "It costs a small network fee and rent in devnet SOL; leaving gives the rent back."}{" "}
            Joining changes nothing about a pet.
          </p>
          <TxReceipt tx={sender.tx} cluster={cluster} />
        </Stack>
      )}
      {connecting ? (
        <WalletSheet
          why={`Connect the wallet that keeps your pets. It signs only when a pet joins or leaves ${guild.name}.`}
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Card>
  );
}
