import { guildCard, petCard } from "@/server/card";
import { readGuild, readPet } from "@/server/solana";
import { isValidSlug } from "@/lib/guilds/guild";

/**
 * An Action's square picture: the pet at `?pet=`, the guild at `?guild=`, or
 * the three species. The edge caches one picture per address it is asked
 * at, so any other query goes to the plain one first: a run of made-up
 * queries cannot make it draw a picture for each.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const kept = [...params.keys()].every((key) => key === "pet" || key === "guild") && params.getAll("pet").length <= 1 && params.getAll("guild").length <= 1;
  if (!kept) {
    const plain = new URL(url.pathname, url);
    for (const key of ["pet", "guild"]) {
      const value = params.get(key);
      if (value) plain.searchParams.set(key, value);
    }
    return Response.redirect(plain, 308);
  }
  const slug = params.get("guild");
  const guild = slug && isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  const pet = params.get("pet");
  const card = guild ? await guildCard(guild) : await petCard(pet ? await readPet(pet).catch(() => null) : null, "square");
  card.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  card.headers.set("Access-Control-Allow-Origin", "*");
  return card;
}
