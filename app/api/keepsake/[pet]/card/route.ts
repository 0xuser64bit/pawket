import { isAddress } from "@solana/kit";
import { getPublicEnv } from "@/config/env";
import { keepsakeCard } from "@/server/card";
import { readPet } from "@/server/solana";

/** The keepsake's picture, the `image` its metadata names: drawn from the record as it is now. */

export const runtime = "nodejs";

type Props = { params: Promise<{ pet: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { pet } = await params;
  // Solana not answering is said and never cached as "no such pet".
  const onChain = isAddress(pet) ? await readPet(pet).catch(() => undefined) : null;
  if (onChain === undefined) return new Response("Solana did not answer. Try again.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!onChain) return new Response("No pet lives at that address.", { status: 404, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
  const card = await keepsakeCard(onChain, getPublicEnv().solanaCluster);
  card.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  card.headers.set("Access-Control-Allow-Origin", "*");
  return card;
}
