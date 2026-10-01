import type { Metadata } from "next";
import { isAddress } from "@solana/kit";
import { BackLink, Banner, Screen } from "@/components/pk";
import { Passport } from "@/components/pet/passport";
import { PetScreen } from "@/components/pet/pet-screen";
import { SPECIES_LABEL } from "@/lib/game/appearance";
import { readKeepsake } from "@/server/keepsake";
import { readPet } from "@/server/solana";
import { sponsorState } from "@/server/sponsor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isAddress(id)) return { title: "Pet" };
  const onChain = await readPet(id).catch(() => null);
  if (!onChain) return { title: "Pet" };
  const { pet, passport } = onChain;
  return {
    title: pet.name,
    description: `${pet.name}, a ${SPECIES_LABEL[pet.species].toLowerCase()} kept on Solana: level ${pet.level}, ${passport.careCount} ${passport.careCount === 1 ? "care" : "cares"}, a ${passport.bestStreak}-day best run.`,
  };
}

/**
 * A pet's record. An address is a pet on Solana, read live and shown to
 * anyone; anything else is the pet kept in this browser, checked there.
 */
export default async function PetPage({ params }: Props) {
  const { id } = await params;
  if (!isAddress(id)) return <PetScreen id={id} />;

  let onChain;
  try {
    onChain = await readPet(id);
  } catch {
    return (
      <Screen width="narrow">
        <BackLink label="Pets on Solana" href="/park" />
        <Banner
          tone="wait"
          title="Solana did not answer"
          body="The record is unchanged; this page could not read it just now. Reload to ask again."
        />
      </Screen>
    );
  }
  if (!onChain) {
    return (
      <Screen width="narrow">
        <BackLink label="Pets on Solana" href="/park" />
        <Banner tone="info" title="No pet lives at that address" body="Nothing on Solana answers to it in Pawket's program." />
      </Screen>
    );
  }
  const [keepsake, sponsor] = await Promise.all([
    readKeepsake(onChain.pet.address).catch(() => null),
    sponsorState().catch(() => null),
  ]);
  return <Passport onChain={onChain} now={new Date()} keepsake={keepsake} canKeep={Boolean(sponsor?.available)} />;
}
