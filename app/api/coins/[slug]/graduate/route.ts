import { graduateTransaction } from "@/server/coins/meteora";
import { coinError, guildOr404, postedFields } from "@/server/coins/routes";
import { actionError, actionJson, caller, preflight } from "@/server/actions";
import { actionLimit } from "@/server/sponsor";

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
    const transaction = await graduateTransaction(guild, posted.account);
    return actionJson({
      type: "transaction",
      transaction,
      message: `Graduate ${guild.name}'s coin into its DAMM v2 pool. You pay the pool's rent and the network fee.`,
    });
  } catch (error) {
    return coinError(error);
  }
}
