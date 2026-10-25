import { guildCard, petCard } from "@/server/card";
import { readGuild, readPet } from "@/server/solana";
import { isValidSlug } from "@/lib/guilds/guild";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("guild");
  const address = url.searchParams.get("pet");
  const guild = slug && isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  const pet = !guild && address ? await readPet(address).catch(() => null) : null;
  const canonical = new URL(url.pathname, url);
  if (guild) canonical.searchParams.set("guild", guild.slug);
  else if (pet) canonical.searchParams.set("pet", pet.pet.address);
  if (canonical.search !== url.search) return Response.redirect(canonical, 307);
  const card = guild ? await guildCard(guild) : await petCard(pet, "square");
  card.headers.set("Cache-Control", "public, max-age=60, s-maxage=60");
  card.headers.set("Access-Control-Allow-Origin", "*");
  return card;
}
