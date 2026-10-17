import { isAddress } from "@solana/kit";
import { getWaveInstruction } from "@/lib/solana/instructions";
import { deriveGuestbookPda } from "@/lib/solana/pda";
import { actionError, actionJson, caller, postedAccount, preflight } from "@/server/actions";
import { actionLimit, mayPayRent, sponsoredForPlayer, sponsorState } from "@/server/sponsor";
import { readGuestbook, readPet } from "@/server/solana";

/**
 * "Wave at Pepper", as a Solana Action: what anyone who opens a pet's card
 * can do — any wallet but the owner's, once a UTC day. The wave lands in the
 * pet's guestbook on Solana and changes nothing about the pet; Pawket pays
 * the fee, and the guestbook's rent the first time.
 */

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Props = { params: Promise<{ pet: string }> };

export async function POST(request: Request, { params }: Props) {
  const { pet } = await params;
  const account = await postedAccount(request);
  if (!account || !isAddress(account)) return actionError("That is not a wallet address. Nothing was sent.");
  const who = caller(request);
  if (!actionLimit(who)) return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);
  const onChain = isAddress(pet) ? await readPet(pet).catch(() => null) : null;
  if (!onChain) return actionError("No pet lives at that address.", 404);
  const { name, owner, address } = onChain.pet;
  if (owner === account) return actionError(`${name} is yours: the guestbook is for everyone else. Nothing was sent.`, 409);
  const book = await readGuestbook(address).catch(() => undefined);
  if (book === undefined) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  const today = Math.floor(Date.now() / 86_400_000);
  if (book?.recent.some((mark) => mark.visitor === account && Math.floor(mark.at / 86_400) === today)) {
    return actionError(`You waved at ${name} today already. Nothing was sent.`, 409);
  }

  const sponsor = await sponsorState().catch(() => null);
  if (!sponsor?.available) return actionError(sponsor?.reason ?? "The sponsor cannot reach the network. Nothing was sent.", 503);
  // The first wave makes the guestbook: that one costs the sponsor rent.
  if (!book && !mayPayRent([account, who])) {
    return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);
  }

  const guestbook = (await deriveGuestbookPda(address)).address;
  const transaction = await sponsoredForPlayer(sponsor.signer, account, ({ owner: visitor, payer }) => [
    getWaveInstruction({ visitor, payer, pet: address, guestbook }),
  ]).catch(() => null);
  if (!transaction) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  return actionJson({ type: "transaction", transaction, message: `Wave at ${name}. Sign it; Pawket pays the fee.` });
}
