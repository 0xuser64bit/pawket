import { isAddress } from "@solana/kit";
import { coinLimit } from "@/server/coins/limits";
import { readPositionFees } from "@/server/coins/meteora";
import { coinError, coinJson, coinLimited, coinProblem, guildOr404 } from "@/server/coins/routes";
import { caller } from "@/server/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Props) {
  const startedAt = Date.now();
  const { slug } = await params;
  const account = new URL(request.url).searchParams.get("account");
  if (!account || !isAddress(account)) return coinProblem("That is not a wallet address.");
  if (!coinLimit("position", caller(request))) return coinLimited();
  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    return coinJson(await readPositionFees(guild, account));
  } catch (error) {
    return coinError(error, "position", startedAt);
  }
}
