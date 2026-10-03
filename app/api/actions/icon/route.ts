import { guildCard, petCard } from "@/server/card";
import { readGuild, readPet } from "@/server/solana";
import { isValidSlug } from "@/lib/guilds/guild";

/** An Action's square picture: the pet at `?pet=`, the guild at `?guild=`, or the three species. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const slug = params.get("guild");
  const guild = slug && isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  const pet = params.get("pet");
  const card = guild ? await guildCard(guild) : await petCard(pet ? await readPet(pet).catch(() => null) : null, "square");
  card.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  card.headers.set("Access-Control-Allow-Origin", "*");
  return card;
}
