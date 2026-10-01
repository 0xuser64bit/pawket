import { NextResponse } from "next/server";
import { isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { PERSONALITY_LABEL, SPECIES_LABEL } from "@/lib/game/appearance";
import { projectGuestPet } from "@/lib/guest/pet";
import { toCompanionRecord } from "@/lib/solana/accounts";
import { actionError, actionJson, caller, postedAccount, preflight } from "@/server/actions";
import { keepsakeTransaction, readKeepsake } from "@/server/keepsake";
import { actionLimit, mayPayRent, sponsorSpent, sponsorState } from "@/server/sponsor";
import { readPet } from "@/server/solana";

/**
 * A pet's keepsake. GET is the card's metadata — the URI it carries, read
 * live from the pet's record, so a wallet that looks again sees the pet as
 * it is now. POST { account } is the card's creation for the owner's wallet
 * to sign, shaped as a Solana Action's answer.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Props = { params: Promise<{ pet: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { pet } = await params;
  const onChain = isAddress(pet) ? await readPet(pet).catch(() => null) : null;
  const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300, s-maxage=300" };
  if (!onChain) return NextResponse.json({ error: "No pet lives at that address." }, { status: 404, headers });

  const app = getPublicEnv().appUrl;
  const record = toCompanionRecord(onChain);
  const projected = projectGuestPet(record, new Date());
  const { pet: chainPet, passport } = onChain;
  const image = `${app}/api/actions/icon?pet=${pet}`;
  return NextResponse.json(
    {
      name: chainPet.name,
      symbol: "PAWKET",
      description: `${chainPet.name}, a ${SPECIES_LABEL[chainPet.species].toLowerCase()} kept on Solana with Pawket. This card is a keepsake: it stays in this wallet and cannot be sold or sent. Every care is on the record at ${app}/pet/${pet}.`,
      image,
      external_url: `${app}/pet/${pet}`,
      attributes: [
        { trait_type: "Species", value: SPECIES_LABEL[chainPet.species] },
        { trait_type: "Personality", value: PERSONALITY_LABEL[chainPet.personality] },
        { trait_type: "Level", value: projected.level },
        { trait_type: "Cares", value: passport.careCount },
        { trait_type: "Longest run (days)", value: passport.bestStreak },
      ],
      properties: { category: "image", files: [{ uri: image, type: "image/png" }] },
    },
    { headers },
  );
}

export async function POST(request: Request, { params }: Props) {
  const { pet } = await params;
  const account = await postedAccount(request);
  if (!account || !isAddress(account)) return actionError("That is not a wallet address. Nothing was sent.");
  const onChain = isAddress(pet) ? await readPet(pet).catch(() => null) : null;
  if (!onChain) return actionError("No pet lives at that address.", 404);
  const { name, owner } = onChain.pet;
  if (owner !== account) return actionError(`Only ${name}'s owner can keep ${name}'s card.`, 403);

  const sponsor = await sponsorState().catch(() => null);
  if (!sponsor?.available) {
    return actionError(sponsor?.reason ?? "The sponsor cannot reach the network. Nothing was sent.", 503);
  }
  const keepsake = await readKeepsake(onChain.pet.address).catch(() => null);
  if (!keepsake) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  if (keepsake.made) return actionError(`${name}'s card is already in this wallet. Nothing was sent.`, 409);
  if (!mayPayRent(account) || !actionLimit(caller(request))) {
    return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);
  }

  const transaction = await keepsakeTransaction(sponsor.signer, onChain);
  sponsorSpent();
  return actionJson({
    type: "transaction",
    transaction,
    message: `Keep ${name}'s card in your wallet. Sign it; Pawket pays the fee and the rent.`,
  });
}
