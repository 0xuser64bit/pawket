import type { Metadata } from "next";
import { isAddress } from "@solana/kit";
import { BackLink, Banner, ReadFailure, Screen } from "@/components/pk";
import { VisitRoom } from "@/components/pet/visit-room";
import { toCompanionRecord } from "@/lib/solana/accounts";
import { readGuestbook, readPet } from "@/server/solana";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const onChain = isAddress(id) ? await readPet(id).catch(() => null) : null;
  return { title: onChain ? `Visiting ${onChain.pet.name}` : "A visit" };
}

export default async function VisitPage({ params }: Props) {
  const { id } = await params;
  let onChain = null;
  try {
    onChain = isAddress(id) ? await readPet(id) : null;
  } catch {
    return (
      <Screen width="narrow">
        <BackLink label="Pets on Solana" href="/park" />
        <ReadFailure body="This visit could not read the pet just now. Trying again only reads its record." />
      </Screen>
    );
  }
  if (!onChain) {
    return (
      <Screen width="narrow">
        <BackLink label="Pets on Solana" href="/park" />
        <Banner tone="info" title="No pet lives at that address" body="Only a pet kept on Solana can be visited." />
      </Screen>
    );
  }
  const guestbook = await readGuestbook(onChain.pet.address).catch(() => null);
  const now = new Date();
  return (
    <VisitRoom
      record={toCompanionRecord(onChain)}
      address={onChain.pet.address}
      owner={onChain.pet.owner}
      waves={guestbook?.waves ?? 0}
      recent={guestbook?.recent ?? []}
      today={Math.floor(now.getTime() / 86_400_000)}
    />
  );
}
