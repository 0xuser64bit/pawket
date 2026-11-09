import { coinLimit } from "@/server/coins/limits";
import { graduateTransaction } from "@/server/coins/meteora";
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
  if (!coinLimit("graduate", [caller(request), posted.account])) return coinLimited();
  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    const transaction = await graduateTransaction(guild, posted.account);
    return coinJson({
      type: "transaction",
      transaction,
      message: `Graduate ${guild.name}'s coin into its DAMM v2 pool. You pay the pool's rent and the network fee.`,
    });
  } catch (error) {
    return coinError(error, "graduate", startedAt);
  }
}
