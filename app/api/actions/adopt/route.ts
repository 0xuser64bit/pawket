import { isAddress, type Address } from "@solana/kit";
import { PetPersonality, PetSpecies } from "@/lib/game/enums";
import { fetchPetOnChain } from "@/lib/solana/accounts";
import { getAdoptPetInstruction } from "@/lib/solana/instructions";
import { derivePassportPda, derivePetPda, normalizePetName } from "@/lib/solana/pda";
import { absolute, actionError, actionJson, adoptLinkedAction, caller, postedAccount, preflight } from "@/server/actions";
import { actionLimit, mayPayRent, sponsoredForPlayer, sponsorRpc, sponsorState } from "@/server/sponsor";

/**
 * "Adopt a pet on Pawket", as a Solana Action: a link that becomes a card
 * in any Blink client. The pet is adopted straight onto Solana devnet;
 * Pawket pays the fee and the rent, and the wallet signs only for the pet.
 */

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

const SPECIES = Object.values(PetSpecies);
const PERSONALITIES = Object.values(PetPersonality);

export async function GET(request: Request) {
  return actionJson({
    type: "action",
    icon: absolute(request, "/api/actions/icon"),
    title: "Adopt a pet on Pawket",
    description:
      "A luna cat, a moss pup or a cloud bun, kept on Solana devnet from the first day: every care a signed record anyone can check. Network fees are covered while sponsorship is available; nothing is for sale.",
    label: "Adopt",
    links: { actions: [adoptLinkedAction()] },
  });
}

export async function POST(request: Request) {
  const query = new URL(request.url).searchParams;
  const account = await postedAccount(request);
  if (!account || !isAddress(account)) return actionError("That is not a wallet address. Nothing was made.");
  const who = caller(request);
  if (!actionLimit(who)) return actionError("Too many in a row. Nothing was made — try again in a while.", 429);
  const species = query.get("species") as PetSpecies | null;
  const personality = query.get("personality") as PetPersonality | null;
  if (!species || !SPECIES.includes(species)) return actionError("Choose a luna cat, a moss pup or a cloud bun.");
  if (!personality || !PERSONALITIES.includes(personality)) return actionError("Choose how you would describe them.");
  let name: string;
  try {
    name = normalizePetName(query.get("name") ?? "");
  } catch {
    return actionError("A name needs at least two characters, and no more than 24.");
  }

  const sponsor = await sponsorState().catch(() => null);
  if (!sponsor?.available) {
    return actionError(sponsor?.reason ?? "The sponsor cannot reach the network. Nothing was made.", 503);
  }
  const owner = account as Address;
  const pet = (await derivePetPda(owner, name)).address;
  if (await fetchPetOnChain(sponsorRpc(), pet).catch(() => null)) {
    return actionError(`This wallet already keeps a pet named ${name}. Pick another name.`, 409);
  }
  // A Blink client may proxy every player through one address, so the wallet counts as well as the address.
  if (!mayPayRent([account, who])) {
    return actionError("Too many adoptions in a row. Nothing was made — try again in a while.", 429);
  }

  const passport = (await derivePassportPda(pet)).address;
  const transaction = await sponsoredForPlayer(sponsor.signer, owner, ({ owner: signer, payer }) => [
    getAdoptPetInstruction({ owner: signer, payer, pet, passport, name, species, personality }),
  ]).catch(() => null);
  if (!transaction) return actionError("Solana did not answer. Nothing was made — try again.", 503);
  return actionJson({
    type: "transaction",
    transaction,
    message: `${name} is coming home. Sign for them; Pawket pays the fee.`,
    links: {
      next: {
        type: "inline",
        action: {
          type: "completed",
          icon: absolute(request, `/api/actions/icon?pet=${pet}`),
          title: `${name} is yours`,
          description: `Kept on Solana devnet. Care for them at ${absolute(request, "/home")}: connect this wallet and link your browser once, and their care needs no more pop-ups. Their record is at ${absolute(request, `/pet/${pet}`)}.`,
          label: "Adopted",
        },
      },
    },
  });
}
