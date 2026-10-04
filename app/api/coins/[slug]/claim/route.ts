import { claimTransaction } from "@/server/coins/meteora";
import { coinError, guildOr404, postedFields } from "@/server/coins/routes";
import { actionError, actionJson, caller, preflight } from "@/server/actions";
import { actionLimit } from "@/server/sponsor";

/** POST { account }: the founder's share of the coin's trading fees, claimed to their own wallet. */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = preflight;

type Props = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Props) {
  const { slug } = await params;
  const posted = await postedFields(request);
  if (!posted) return actionError("That is not a wallet address. Nothing was sent.");
  if (!actionLimit(caller(request))) return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);
  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    const transaction = await claimTransaction(guild, posted.account);
    return actionJson({ type: "transaction", transaction, message: `Claim your share of ${guild.name}'s coin fees.` });
  } catch (error) {
    return coinError(error);
  }
}
