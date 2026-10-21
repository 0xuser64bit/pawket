import { tradeTransaction, type TradeSide } from "@/server/coins/meteora";
import { coinError, guildOr404, postedFields, units } from "@/server/coins/routes";
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
  const side = posted.fields.side as TradeSide;
  if (side !== "buy" && side !== "sell") return actionError("Choose to buy or to sell.");
  const amountIn = units(posted.fields.amount);
  const minimumOut = units(posted.fields.minimumOut);
  if (!amountIn || !minimumOut) return actionError("Choose an amount above nothing, and quote it first.");
  if (!actionLimit(caller(request))) return actionError("Too many in a row. Nothing was sent — try again in a while.", 429);

  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    const transaction = await tradeTransaction({ guild, owner: posted.account, side, amountIn, minimumOut });
    return actionJson({
      type: "transaction",
      transaction,
      message: `${side === "buy" ? "Buy" : "Sell"} ${guild.name}'s coin at no worse than the quote. You pay the network fee.`,
    });
  } catch (error) {
    return coinError(error);
  }
}
