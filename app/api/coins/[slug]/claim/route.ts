import { coinLimit } from "@/server/coins/limits";
import { claimTransaction, positionFeeTransaction } from "@/server/coins/meteora";
import { coinError, coinJson, coinLimited, coinPreflight, coinProblem, guildOr404, postedFields } from "@/server/coins/routes";
import { caller } from "@/server/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const OPTIONS = coinPreflight;

type Props = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Props) {
  const startedAt = Date.now();
  const { slug } = await params;
  const posted = await postedFields(request);
  if (!posted) return coinProblem("That is not a wallet address. Nothing was sent.");
  if (!coinLimit("claim", [caller(request), posted.account])) return coinLimited();
  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    const fromPool = posted.fields.from === "pool";
    const transaction = fromPool ? await positionFeeTransaction(guild, posted.account) : await claimTransaction(guild, posted.account);
    return coinJson({
      type: "transaction",
      transaction,
      message: fromPool ? `Claim what your locked liquidity in ${guild.name}'s pool has earned.` : `Claim your share of ${guild.name}'s coin fees.`,
    });
  } catch (error) {
    return coinError(error, "claim", startedAt);
  }
}
