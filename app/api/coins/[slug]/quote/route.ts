import { getPublicEnv } from "@/config/env";
import { QUOTE_TTL_MS, type TradeSide } from "@/lib/coins/quote";
import { readDeadline } from "@/lib/utils/deadline";
import { quoteTrade } from "@/server/coins/meteora";
import { coinLimit } from "@/server/coins/limits";
import { sealQuote } from "@/server/coins/quote-token";
import { coinError, coinJson, coinLimited, coinProblem, guildOr404, units } from "@/server/coins/routes";
import { caller } from "@/server/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Props) {
  const startedAt = Date.now();
  const { slug } = await params;
  const query = new URL(request.url).searchParams;
  const side = query.get("side") as TradeSide | null;
  if (side !== "buy" && side !== "sell") return coinProblem("Choose to buy or to sell.");
  const amount = units(query.get("amount"));
  if (!amount) return coinProblem("Choose an amount above nothing.");
  const slippage = Number(query.get("slippage") ?? 100);
  if (!Number.isInteger(slippage) || slippage < 10 || slippage > 1000) return coinProblem("Slippage is 0.1% to 10%.");
  if (!coinLimit("quote", caller(request))) return coinLimited();

  const deadline = readDeadline(15_000, request.signal);
  try {
    const guild = await guildOr404(slug, deadline.signal);
    if (guild instanceof Response) return guild;
    const quote = await quoteTrade(guild, side, amount, slippage, deadline.signal);
    deadline.signal.throwIfAborted();
    const token = sealQuote({
      v: 1,
      cluster: getPublicEnv().solanaCluster,
      slug: quote.slug,
      mint: quote.mint,
      preset: quote.preset,
      route: quote.route,
      side: quote.side,
      amountIn: quote.amountIn,
      minimumOut: quote.minimumOut,
      slippageBps: quote.slippageBps,
      quotedAt: quote.quotedAt,
      expiresAt: quote.quotedAt + QUOTE_TTL_MS,
    });
    return coinJson({ ...quote, token });
  } catch (error) {
    return coinError(error, "quote", startedAt);
  } finally {
    // Promise.all may reject before another SDK read finishes. Stop every
    // remaining request as well as its timer before returning a response.
    deadline.abort();
  }
}
