import { isAddress } from "@solana/kit";
import { readPositionFees } from "@/server/coins/meteora";
import { coinError, coinJson, coinProblem, guildOr404 } from "@/server/coins/routes";
import { caller } from "@/server/actions";
import { actionLimit } from "@/server/sponsor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Props) {
  const startedAt = Date.now();
  const { slug } = await params;
  const account = new URL(request.url).searchParams.get("account");
  if (!account || !isAddress(account)) return coinProblem("That is not a wallet address.");
  if (!actionLimit(caller(request))) return coinProblem("Too many in a row. Try again in a while.", 429);
  const guild = await guildOr404(slug);
  if (guild instanceof Response) return guild;
  try {
    return coinJson(await readPositionFees(guild, account));
  } catch (error) {
    return coinError(error, "position", startedAt);
  }
}
