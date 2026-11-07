import { getPublicEnv } from "@/config/env";
import type { TradeSide } from "@/lib/coins/quote";
import { tradeTransaction } from "@/server/coins/meteora";
import { openQuote } from "@/server/coins/quote-token";
import { coinError, coinJson, coinPreflight, coinProblem, guildOr404, postedFields, units } from "@/server/coins/routes";
import { caller } from "@/server/actions";
import { actionLimit } from "@/server/sponsor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = coinPreflight;

type Props = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Props) {
  const startedAt = Date.now();
  const { slug } = await params;
  const posted = await postedFields(request);
  if (!posted) return coinProblem("That is not a wallet address. Nothing was sent.");
  const side = posted.fields.side as TradeSide;
  if (side !== "buy" && side !== "sell") return coinProblem("Choose to buy or to sell.");
  const amountIn = units(posted.fields.amount);
  const minimumOut = units(posted.fields.minimumOut);
  if (!amountIn || !minimumOut) return coinProblem("Choose an amount above nothing, and quote it first.");
  if (!actionLimit(caller(request))) return coinProblem("Too many in a row. Nothing was sent — try again in a while.", 429);

  const quote = openQuote(posted.fields.quote);
  if (!quote) return coinProblem("That quote is not Pawket's, or it expired. Quote again. Nothing was sent.", 409);
  if (
    quote.cluster !== getPublicEnv().solanaCluster ||
    quote.slug !== slug ||
    quote.side !== side ||
    quote.amountIn !== amountIn.toString() ||
    quote.minimumOut !== minimumOut.toString()
  ) {
    return coinProblem("That quote was for different inputs. Quote again. Nothing was sent.", 409);
  }

  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    const transaction = await tradeTransaction({ guild, owner: posted.account, side, amountIn, minimumOut, quote });
    return coinJson({
      type: "transaction",
      transaction,
      message: `${side === "buy" ? "Buy" : "Sell"} ${guild.name}'s coin at no worse than the quote. You pay the network fee.`,
    });
  } catch (error) {
    return coinError(error, "trade", startedAt);
  }
}
