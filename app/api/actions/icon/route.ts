import { petCard } from "@/server/card";
import { readPet } from "@/server/solana";

/** An Action's square picture: the pet at `?pet=`, or the three species. */
export async function GET(request: Request) {
  const pet = new URL(request.url).searchParams.get("pet");
  const onChain = pet ? await readPet(pet).catch(() => null) : null;
  const card = await petCard(onChain, "square");
  card.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  card.headers.set("Access-Control-Allow-Origin", "*");
  return card;
}
