import type { Metadata } from "next";
import Link from "next/link";
import {
  BackLink,
  Banner,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  LaunchStage,
  Paper,
  PetFrame,
  Presence,
  Row,
  Screen,
  Stack,
} from "@/components/pk";
import { GuildCrest } from "@/components/guilds/guild-crest";
import { GuildMembership } from "@/components/guilds/membership";
import { GuildGatherings } from "@/components/guilds/gatherings";
import { ShareButton } from "@/components/pet/share-button";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, streakAsOf } from "@/lib/guest/pet";
import { DELISTED_SLUGS } from "@/lib/guilds/delisted";
import { isValidSlug } from "@/lib/guilds/guild";
import { toCompanionRecord, type ChainGuild, type PetOnChain } from "@/lib/solana/accounts";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { formatUtcDate } from "@/lib/utils/format";
import type { CoinState } from "@/server/coins/meteora";
import { readGatherings, readGuild, readGuildPets } from "@/server/solana";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guild = isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  if (!guild) return { title: "Guild" };
  return {
    title: guild.name,
    description: `${guild.name}, a guild of ${guild.memberCount} ${guild.memberCount === 1 ? "pet" : "pets"} on Solana. ${guild.motto}`.trim(),
  };
}

const since = (seconds: number) => formatUtcDate(new Date(seconds * 1000).toISOString());

/**
 * A guild, as anyone can see it: its crest, its name and motto, the pets in
 * it — read live from their own accounts — and what they have done
 * together, counted. Then, for a visitor with pets on Solana, the way in or
 * out; then, on Paper, what it is on chain.
 */
export default async function GuildPage({ params }: Props) {
  const { slug } = await params;
  let guild: ChainGuild | null = null;
  let pets: PetOnChain[] = [];
  let coin: CoinState | null = null;
  let holders: Set<string> | null = null;
  let gatherings: Awaited<ReturnType<typeof readGatherings>> = { events: [], polls: [] };
  try {
    guild = isValidSlug(slug) ? await readGuild(slug) : null;
    if (guild) {
      // The coin is optional and read beside the pets: if it — or Meteora's SDK — cannot be read, the guild still shows.
      const found = guild;
      const coins = import("@/server/coins/meteora").catch(() => null);
      [pets, coin, gatherings] = await Promise.all([
        readGuildPets(found.address),
        coins.then((module) => module?.readCoin(found) ?? null).catch(() => null),
        readGatherings(found.address).catch(() => gatherings),
      ]);
      holders = coin ? await coins.then((module) => module?.readHolderWallets(coin!) ?? null).catch(() => null) : null;
    }
  } catch {
    return (
      <Screen width="narrow">
        <BackLink label="Guilds" href="/guilds" />
        <Banner tone="wait" title="Solana did not answer" body="The guild is unchanged; this page could not read it just now. Reload to ask again." />
      </Screen>
    );
  }
  if (!guild) {
    return (
      <Screen width="narrow">
        <BackLink label="Guilds" href="/guilds" />
        <Banner tone="info" title="No guild has that name" body="Nothing on Solana answers to it in Pawket's program. It is free to found." />
      </Screen>
    );
  }

  const now = new Date();
  const records = pets
    .map((entry) => ({ entry, record: toCompanionRecord(entry) }))
    .sort((a, b) => b.record.xp - a.record.xp);
  const outToday = records.filter(({ record }) => streakAsOf(record.streak, now).activeToday).length;
  const cares = pets.reduce((sum, entry) => sum + entry.passport.careCount, 0);
  const bestRun = Math.max(0, ...pets.map((entry) => entry.passport.bestStreak));
  const founder = pets.find((entry) => entry.pet.address === guild.founderPet);
  const cluster = getPublicEnv().solanaCluster;
  const delisted = DELISTED_SLUGS.has(guild.slug);

  return (
    <Screen>
      <BackLink label="Guilds" href="/guilds" />
      <Stack gap={5}>
        <div className="pk-guild-head">
          <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="lg" />
          <div>
            <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
              {guild.name}
            </h1>
            {guild.motto ? <p className="body-lg pk-muted">{guild.motto}</p> : null}
            <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
              <Chip label={`${guild.memberCount} ${guild.memberCount === 1 ? "pet" : "pets"}`} tone="pool" icon="users" />
              <Chip label={`Since ${since(guild.createdAt)}`} />
              <Chip label="Optional" tone="bloom" icon="guild" />
            </Row>
            <Row gap={3} wrap style={{ marginTop: "var(--space-3)", alignItems: "center" }}>
              <ShareButton name={guild.name} label={`Share ${guild.name}`} />
              <span className="caption pk-faint">
                Shared, this link is also a Solana Action: in a Blink-aware wallet it opens as {guild.name}&apos;s card, and a pet
                joins from there.
              </span>
            </Row>
          </div>
        </div>

        {delisted ? (
          <Banner
            tone="risk"
            title="Pawket no longer shows this guild"
            body="Pawket stopped promoting it under its guild rule. It is still on Solana, and Pawket cannot remove it, take a pet out of it or undo anything it did."
          />
        ) : null}

        <Stack gap={4}>
          <div className="pk-spread">
            <h2 className="display-s">The pets</h2>
            {outToday > 0 ? <Presence name={`${outToday} out today`} /> : <span className="caption pk-faint">Nobody out yet today</span>}
          </div>
          {records.length === 0 ? (
            <EmptyState icon="paw" title="Nobody here yet" body="A guild with nobody in it is still on the record. The next pet to join is its first." />
          ) : (
            <div className="pk-cards">
              {records.map(({ entry, record }) => {
                const { level, mood } = projectGuestPet(record, now);
                const out = streakAsOf(record.streak, now).activeToday;
                return (
                  <Card key={entry.pet.address} variant="flush">
                    <Link href={`/pet/${entry.pet.address}`} className="pk-card__art" aria-label={`${entry.pet.name}'s record`}>
                      <PetFrame {...petLook(record, mood)} sky={SPECIES_SKY[record.species]} level={level} size="fluid" still />
                    </Link>
                    <div className="pk-card__body">
                      <h3 className="title">
                        {entry.pet.name}
                        {holders?.has(entry.pet.owner) ? (
                          <span className="pk-coin-pin" title={`Wears ${guild.name}'s crest pin: its owner holds the coin`}>
                            <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="sm" />
                            <span className="pk-sr">, wears the crest pin</span>
                          </span>
                        ) : null}
                      </h3>
                      <p className="caption pk-faint">
                        Level {level}
                        {entry.pet.address === guild.founderPet ? " · founder" : ""}
                      </p>
                      {out ? (
                        <div style={{ marginTop: "var(--space-2)" }}>
                          <Presence name="Out today" />
                        </div>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Stack>

        {/* What the guild has done together, joining it, and its facts: one row of equal cards under the shelf. */}
        <div className="pk-guild-facts">
          <Card>
            <h2 className="title">Together</h2>
            <dl className="pk-together">
              <div>
                <dt className="label pk-faint">Cares given</dt>
                <dd className="amount">{cares}</dd>
              </div>
              <div>
                <dt className="label pk-faint">Longest run</dt>
                <dd>
                  <span className="amount">{bestRun}</span> <span className="caption pk-faint">{bestRun === 1 ? "day" : "days"}</span>
                </dd>
              </div>
              <div>
                <dt className="label pk-faint">Out today</dt>
                <dd className="amount">{outToday}</dd>
              </div>
            </dl>
            <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
              Counted from each pet&apos;s own Passport. A guild keeps no score of its own, and none of this
              changes a pet.
            </p>
          </Card>
          {delisted ? null : <GuildMembership guild={{ address: guild.address, name: guild.name }} />}
          {delisted ? null : (
            <GuildGatherings guild={{ address: guild.address, name: guild.name, founder: guild.founder }} events={gatherings.events} polls={gatherings.polls} />
          )}
          {coin ? <CoinCard guildName={guild.name} slug={guild.slug} coin={coin} /> : null}
          <Paper title="On the record" meta={`Solana ${cluster}`}>
            <div className="pk-receipt">
              <Fact k="Guild" value={guild.address} cluster={cluster} />
              <Fact k="Founded by" value={guild.founder} cluster={cluster} />
              <Fact k="Program" value={PAWKET_PROGRAM_ID} cluster={cluster} />
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">Address</span>
                <span className="pk-receipt__v">{guild.slug}</span>
              </div>
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">Founded</span>
                <span className="pk-receipt__v">
                  {since(guild.createdAt)}
                  {founder ? ` by ${founder.pet.name}` : ""}
                </span>
              </div>
            </div>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
              Each pet joins and leaves with its owner&apos;s signature. Pawket cannot add a pet, remove one or
              change the guild.
            </p>
          </Paper>
        </div>
      </Stack>
    </Screen>
  );
}

function Fact({ k, value, cluster }: { k: string; value: string; cluster: ReturnType<typeof getPublicEnv>["solanaCluster"] }) {
  return (
    <div className="pk-receipt__row">
      <span className="pk-receipt__k">{k}</span>
      <AddressLine value={value} label={k.toLowerCase()} href={explorerAddressUrl(value, cluster)} />
    </div>
  );
}

const COIN_LINE: Record<CoinState["stage"], (guild: string) => string> = {
  none: (guild) => `${guild} has no coin. Its founder can launch one, optional like the guild, and it never touches a pet.`,
  dbc: () => "On its bonding curve on Meteora. Holders' pets wear the crest pin here; nothing else changes.",
  pending: () => "Raised its threshold and graduating into its DAMM v2 pool. Trading is paused until then.",
  damm: () => "Graduated: it trades in its DAMM v2 pool, its liquidity locked for good.",
  suspended: () => "Pawket stopped offering trades in it. What anyone holds is untouched on Solana.",
};

/** The guild's coin, in a line, with the way to its page — the only place a coin is traded. */
function CoinCard({ guildName, slug, coin }: { guildName: string; slug: string; coin: CoinState }) {
  return (
    <Card>
      <h2 className="title">{coin.stage === "none" ? "A coin, if it wants one" : coin.name}</h2>
      <div style={{ marginTop: "var(--space-2)" }}>
        <LaunchStage stage={coin.stage} />
      </div>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
        {COIN_LINE[coin.stage](guildName)}
      </p>
      <div style={{ marginTop: "var(--space-4)" }}>
        <ButtonLink label={coin.stage === "none" ? "How a coin works" : "Open the coin"} href={`/guilds/${slug}/coin`} tone="quiet" size="sm" after="right" />
      </div>
    </Card>
  );
}
