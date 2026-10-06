import { isAddress } from "@solana/kit";
import { isValidSlug } from "@/lib/guilds/guild";
import { isListed } from "@/lib/guilds/delisted";
import { getJoinGuildInstruction } from "@/lib/solana/instructions";
import { deriveMemberPda } from "@/lib/solana/pda";
import { absolute, actionError, actionJson, caller, postedAccount, preflight } from "@/server/actions";
import { actionLimit, mayPayRent, sponsoredForPlayer, sponsorState } from "@/server/sponsor";
import { readGuild, readOwnedPets } from "@/server/solana";

/**
 * "Join Sunbeam Club", as a Solana Action: the guild's card, live from
 * chain, and one button. The pet that joins is the wallet's most recently
 * adopted pet on Solana that is in no guild yet; its owner signs, and
 * Pawket pays the fee and the rent. Optional, like every guild — and a
 * guild never changes a pet.
 */

export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Props = { params: Promise<{ slug: string }> };

async function guildAt(slug: string) {
  return isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
}

export async function GET(request: Request, { params }: Props) {
  const { slug } = await params;
  const guild = await guildAt(slug);
  if (!guild || !isListed(guild)) return actionError("No guild has that name.", 404);
  return actionJson({
    type: "action",
    icon: absolute(request, `/api/actions/icon?guild=${guild.slug}`),
    title: guild.name,
    description: `${guild.motto ? `${guild.motto} ` : ""}A guild of ${guild.memberCount} ${guild.memberCount === 1 ? "pet" : "pets"} on Solana. Optional, free to join and to leave, and nothing in it changes a pet. Your most recent pet that is in no guild joins. Network fees are covered while sponsorship is available.`,
    label: "Join",
    links: {
      actions: [{ type: "transaction", label: `Join ${guild.name}`, href: `/api/actions/guild/${guild.slug}` }],
    },
  });
}

export async function POST(request: Request, { params }: Props) {
  const { slug } = await params;
  const account = await postedAccount(request);
  if (!account || !isAddress(account)) return actionError("That is not a wallet address. Nothing was sent.");
  const guild = await guildAt(slug);
  if (!guild || !isListed(guild)) return actionError("No guild has that name.", 404);

  const pets = await readOwnedPets(account).catch(() => null);
  if (!pets) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  if (pets.length === 0) {
    return actionError("This wallet keeps no pet on Solana yet. Adopt one first — the adoption is a Blink too. Nothing was sent.", 409);
  }
  if (pets.some((entry) => entry.member?.guild === guild.address)) {
    return actionError(`A pet of yours is in ${guild.name} already. Nothing was sent.`, 409);
  }
  const free = pets.find((entry) => entry.member === null);
  if (!free) return actionError("Every pet this wallet keeps is in a guild already; a pet is in one at a time. Nothing was sent.", 409);

  const sponsor = await sponsorState().catch(() => null);
  if (!sponsor?.available) {
    return actionError(sponsor?.reason ?? "The sponsor cannot reach the network. Nothing was sent.", 503);
  }
  const key = caller(request);
  if (!mayPayRent(account) || !actionLimit(key)) return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);

  const member = (await deriveMemberPda(free.pet.address)).address;
  const transaction = await sponsoredForPlayer(sponsor.signer, free.pet.owner, ({ owner, payer }) => [
    getJoinGuildInstruction({ owner, payer, pet: free.pet.address, guild: guild.address, member }),
  ]);
  return actionJson({
    type: "transaction",
    transaction,
    message: `${free.pet.name} joins ${guild.name}. Sign it; Pawket pays the fee and the rent, and gives the rent back if they leave.`,
  });
}
