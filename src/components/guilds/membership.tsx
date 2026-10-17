"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NavLink as Link } from "@/components/pk/nav-link";
import { Button, PetArt, Waiting } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { getJoinGuildInstruction, getLeaveGuildInstruction } from "@/lib/solana/instructions";
import { deriveMemberPda } from "@/lib/solana/pda";
import { rentWaits, usePawketSend, useSponsor } from "@/lib/solana/use-send";

/**
 * Your pets and this guild, in the guild's head: each pet on Solana with
 * the one thing it can do here — join, leave, or nothing while it is in
 * another guild. Joining and leaving are signed by the pet's owner (or the
 * browser linked to them, with no pop-up); Pawket pays the fee while it
 * can. The page is read again from Solana once a send is confirmed.
 */
export function GuildMembership({ guild }: { guild: { address: string; name: string } }) {
  const companion = useCompanion();
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const waits = rentWaits(sponsor.data);

  async function join(entry: PetOnChain) {
    const member = (await deriveMemberPda(entry.pet.address)).address;
    const result = await sender.act(`${entry.pet.name} joins ${guild.name}`, ({ owner, payer }) => [
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
    const result = await sender.act(`${entry.pet.name} leaves ${guild.name}`, ({ owner }) => [
      getLeaveGuildInstruction({ owner, pet: entry.pet.address, member: member.address, guild: member.guild, payer: member.payer }),
    ]);
    if (result) {
      companion.refresh();
      router.refresh();
    }
  }

  if (!companion.ready) return <Waiting label="Reading your pets" inline />;

  return (
    <div className="pk-join">
      {!companion.owner ? (
        <>
          <Button label="Connect to join" icon="wallet" tone="bloom" size="sm" onClick={() => setConnecting(true)} />
          <p className="caption pk-faint">A pet joins from the wallet that keeps it on Solana. Connecting signs nothing.</p>
        </>
      ) : companion.chainError ? (
        <p className="caption pk-faint">
          Solana did not answer when this page asked for your pets.{" "}
          <button type="button" className="pk-linkish" onClick={companion.refresh}>
            Ask again
          </button>
        </p>
      ) : companion.owned.length === 0 ? (
        <p className="caption pk-faint">
          This wallet keeps no pet on Solana yet. <Link href="/home">Keep one there from Home</Link>, and it can join.
        </p>
      ) : (
        <>
          <div className="pk-join__pets">
            {companion.owned.map((entry) => {
              const here = entry.member?.guild === guild.address;
              const elsewhere = entry.member !== null && !here;
              return (
                <div key={entry.pet.address} className={here ? "pk-join__pet pk-join__pet--in" : "pk-join__pet"}>
                  <span className="pk-avatar" aria-hidden="true">
                    <PetArt {...petLook(toCompanionRecord(entry))} still />
                  </span>
                  <span className="body-sm">
                    <b>{entry.pet.name}</b>
                    {here ? " is in" : elsewhere ? " · in another guild" : ""}
                  </span>
                  {here ? (
                    <Button label="Leave" tone="ghost" size="sm" disabled={sender.busy} onClick={() => void leave(entry)} />
                  ) : elsewhere ? null : (
                    <Button label="Join" tone="bloom" size="sm" icon="guild" disabled={sender.busy || !companion.canSign || waits} onClick={() => void join(entry)} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="caption pk-faint">
            One guild per pet; joining changes nothing about it.{" "}
            {sponsor.data?.available
              ? "Pawket pays the fee and the rent, and gets the rent back when a pet leaves."
              : waits
                ? "Joining waits until Pawket can cover a new place's rent again. Leaving works now."
                : null}
          </p>
        </>
      )}
      {connecting ? (
        <WalletSheet
          why={`Connect the wallet that keeps your pets. It signs only when a pet joins or leaves ${guild.name}.`}
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </div>
  );
}
