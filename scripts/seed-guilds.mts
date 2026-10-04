/**
 * Founds Pawket's starter guilds on a cluster, so discovery is never an empty
 * page: three guilds, each founded by a pet and joined by two more — the
 * three pets a guild needs before it may launch a coin — every pet fed
 * once. Run it again and it does only what is missing.
 *
 *   pnpm dlx tsx scripts/seed-guilds.mts
 *
 * The pets belong to a founder wallet kept in .keys/guild-founder.json (made
 * here the first time; it never holds SOL). The sponsor in .keys/sponsor.json
 * pays every fee and rent through the same checks as /api/sponsor.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createKeyPairSignerFromBytes, createSolanaRpc } from "@solana/kit";
import { CareActionType, PetPersonality, PetSpecies } from "../src/lib/game/enums";
import { CREST_COLOURS, CREST_GLYPHS } from "../src/lib/guilds/guild";
import { fetchGuild, fetchPetOnChain } from "../src/lib/solana/accounts";
import {
  getAdoptPetInstruction,
  getCareInstruction,
  getFoundGuildInstruction,
  getJoinGuildInstruction,
} from "../src/lib/solana/instructions";
import { deriveGuildPda, deriveMemberPda, derivePassportPda, derivePetPda } from "../src/lib/solana/pda";
import { sendPawket } from "../src/lib/solana/send";
import { cosign } from "../src/lib/solana/sponsor";

const rpc = createSolanaRpc(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com");
const sponsor = await createKeyPairSignerFromBytes(
  Uint8Array.from(JSON.parse(readFileSync(".keys/sponsor.json", "utf8")) as number[]),
);

const FOUNDER = ".keys/guild-founder.json";
if (!existsSync(FOUNDER)) {
  const { secretKey } = await import("node:crypto").then(async ({ generateKeyPairSync }) => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const seed = privateKey.export({ format: "der", type: "pkcs8" }).subarray(-32);
    const pub = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
    return { secretKey: [...seed, ...pub] };
  });
  writeFileSync(FOUNDER, JSON.stringify(secretKey), { mode: 0o600 });
}
const owner = await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(readFileSync(FOUNDER, "utf8")) as number[]));

const send = (label: string, instructions: Parameters<typeof sendPawket>[0]["instructions"]) =>
  sendPawket({
    rpc,
    owner,
    sponsor: sponsor.address,
    instructions,
    cosign: async (wire: string) => (await cosign(sponsor, wire)).transaction,
  })
    .then((result) => console.log(`${label}: ${result.outcome} ${result.signature}`))
    // The public devnet RPC rate-limits a burst; a breath between sends keeps under it.
    .then(() => new Promise((resolve) => setTimeout(resolve, 2500)));

const glyph = (name: (typeof CREST_GLYPHS)[number]) => CREST_GLYPHS.indexOf(name);
const colour = (id: (typeof CREST_COLOURS)[number]["id"]) => CREST_COLOURS.findIndex((hue) => hue.id === id);

const GUILDS = [
  {
    slug: "sunbeam-club",
    name: "Sunbeam Club",
    motto: "Naps first, questions later.",
    crest: glyph("spark"),
    colour: colour("sun"),
    founder: { name: "Saffron", species: PetSpecies.LunaCat, personality: PetPersonality.Cozy },
    member: { name: "Marmalade", species: PetSpecies.LunaCat, personality: PetPersonality.Curious },
    friend: { name: "Nib", species: PetSpecies.LunaCat, personality: PetPersonality.Mischief },
  },
  {
    slug: "muddy-paws",
    name: "Muddy Paws",
    motto: "Every walk is the best walk.",
    crest: glyph("paw"),
    colour: colour("copper"),
    founder: { name: "Biscuit", species: PetSpecies.MossPup, personality: PetPersonality.Brave },
    member: { name: "Waffles", species: PetSpecies.MossPup, personality: PetPersonality.Mischief },
    friend: { name: "Juniper", species: PetSpecies.MossPup, personality: PetPersonality.Curious },
  },
  {
    slug: "cloud-nine",
    name: "Cloud Nine",
    motto: "Soft, quiet, and braver than we look.",
    crest: glyph("heart"),
    colour: colour("pool"),
    founder: { name: "Mochi", species: PetSpecies.CloudBun, personality: PetPersonality.Cozy },
    member: { name: "Clover", species: PetSpecies.CloudBun, personality: PetPersonality.Brave },
    friend: { name: "Dumpling", species: PetSpecies.CloudBun, personality: PetPersonality.Curious },
  },
];

type Seed = (typeof GUILDS)[number]["founder"];

/** The pet at its address, adopted and fed once if it was not there. */
async function pet(seed: Seed) {
  const address = (await derivePetPda(owner.address, seed.name)).address;
  if (!(await fetchPetOnChain(rpc, address))) {
    const passport = (await derivePassportPda(address)).address;
    await send(`adopt ${seed.name}`, ({ owner: signer, payer }) => [
      getAdoptPetInstruction({ owner: signer, payer, pet: address, passport, ...seed }),
    ]);
    await send(`feed ${seed.name}`, ({ owner: signer }) => [
      getCareInstruction({ owner: signer, pet: address, passport, action: CareActionType.Feed }),
    ]);
  }
  return address;
}

for (const guild of GUILDS) {
  const founder = await pet(guild.founder);
  const members = [await pet(guild.member), await pet(guild.friend)];
  const address = (await deriveGuildPda(guild.slug)).address;
  if (!(await fetchGuild(rpc, guild.slug))) {
    const place = (await deriveMemberPda(founder)).address;
    await send(`found ${guild.name}`, ({ owner: signer, payer }) => [
      getFoundGuildInstruction({
        owner: signer,
        payer,
        pet: founder,
        guild: address,
        member: place,
        slug: guild.slug,
        name: guild.name,
        motto: guild.motto,
        crest: guild.crest,
        colour: guild.colour,
      }),
    ]);
  }
  for (const [i, member] of members.entries()) {
    if ((await fetchPetOnChain(rpc, member))?.member) continue;
    const place = (await deriveMemberPda(member)).address;
    await send(`${[guild.member, guild.friend][i].name} joins ${guild.name}`, ({ owner: signer, payer }) => [
      getJoinGuildInstruction({ owner: signer, payer, pet: member, guild: address, member: place }),
    ]);
  }
  console.log(`${guild.name}: ${(await fetchGuild(rpc, guild.slug))?.memberCount} pets at /guilds/${guild.slug}`);
}
console.log(`Founder wallet: ${owner.address}`);
