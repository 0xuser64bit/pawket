import { COIN_TERMS, findPreset } from "@/lib/coins/presets";
import { isListed } from "@/lib/guilds/delisted";
import { launchTransaction } from "@/server/coins/meteora";
import { coinError, coinMetadataUri, guildOr404, postedFields, units } from "@/server/coins/routes";
import { actionError, actionJson, caller, preflight } from "@/server/actions";
import { readPet } from "@/server/solana";
import { actionLimit } from "@/server/sponsor";

/**
 * POST { account, preset, firstBuy }: the guild's coin, launched by its
 * founder on one of Pawket's presets — the curve and the coin, made in one
 * transaction their wallet signs, with their own first buy in it when they
 * ask. Only the founder, while the pet they founded it with is still in it,
 * only once, only for a guild with enough pets in it to be a community first.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = preflight;

type Props = { params: Promise<{ slug: string }> };

/** The most a founder may put into their own first buy, in lamports. */
const MAX_FIRST_BUY = 10_000_000_000n;

export async function POST(request: Request, { params }: Props) {
  const { slug } = await params;
  const posted = await postedFields(request);
  if (!posted) return actionError("That is not a wallet address. Nothing was sent.");
  const preset = findPreset(typeof posted.fields.preset === "string" ? posted.fields.preset : null);
  if (!preset) return actionError("Choose one of Pawket's curves.");
  const firstBuy = posted.fields.firstBuy === undefined ? 0n : units(posted.fields.firstBuy);
  if (firstBuy === null || firstBuy > MAX_FIRST_BUY) return actionError("A first buy is up to 10 SOL, or none.");

  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  if (posted.account !== guild.founder) return actionError(`Only the wallet that founded ${guild.name} launches its coin. Nothing was sent.`, 403);
  if (!isListed(guild)) return actionError(`Pawket does not offer coins for ${guild.name}. Nothing was sent.`, 403);
  if (guild.memberCount < COIN_TERMS.minMembers) {
    return actionError(`A guild launches a coin once ${COIN_TERMS.minMembers} pets are in it; ${guild.name} has ${guild.memberCount}. Nothing was sent.`, 409);
  }
  if (!actionLimit(caller(request))) return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);
  const founding = await readPet(guild.founderPet).catch(() => undefined);
  if (founding === undefined) return actionError("Solana did not answer. Nothing was sent — try again.", 503);
  if (founding?.member?.guild !== guild.address) {
    return actionError(`The pet that founded ${guild.name} has left it, and a coin is launched only while it is in. Nothing was sent.`, 403);
  }

  try {
    const transaction = await launchTransaction({
      guild,
      founder: posted.account,
      preset: preset.id,
      firstBuyLamports: firstBuy,
      metadataUri: coinMetadataUri(slug),
    });
    return actionJson({
      type: "transaction",
      transaction,
      message: `Launch ${guild.name}'s coin on the ${preset.name.toLowerCase()}. You pay its rent, the launch fee and the network fee.`,
    });
  } catch (error) {
    return coinError(error);
  }
}
