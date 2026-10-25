import type { Metadata } from "next";
import { NavLink as Link } from "@/components/pk/nav-link";
import { BackLink, Banner, ButtonLink, Card, Chip, LaunchStage, PetArt, Presence, ReadFailure, Row, Screen, Stack } from "@/components/pk";
import { GuildCrest } from "@/components/guilds/guild-crest";
import { GuildMembership } from "@/components/guilds/membership";
import { GuildRole } from "@/components/guilds/yours";
import { GuildGatherings } from "@/components/guilds/gatherings";
import { ShareButton } from "@/components/pet/share-button";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { guildReportUrl } from "@/config/site";
import { SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, streakAsOf } from "@/lib/guest/pet";
import { DELISTED_SLUGS } from "@/lib/guilds/delisted";
import { isValidSlug, nameFor } from "@/lib/guilds/guild";
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
        <ReadFailure body="This page could not read the guild just now. Trying again only reads its record." />
      </Screen>
    );
  }
  if (!guild) {
    const unfounded = nameFor(slug);
    return (
      <Screen width="narrow">
        <BackLink label="Guilds" href="/guilds" />
        <Banner
          tone="info"
          title="No guild has that name"
          body={unfounded ? "Nothing on Solana answers to it in Pawket's program. It is free to found." : "Nothing on Solana answers to it in Pawket's program."}
          action={<ButtonLink label={unfounded ? `Found ${unfounded}` : "Found a guild"} href={unfounded ? `/guilds/new?name=${encodeURIComponent(unfounded)}` : "/guilds/new"} tone="quiet" size="sm" icon="guild" />}
        />
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
      <Stack gap={6}>
        <header className="pk-guild-hero">
          <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="lg" />
          <div className="pk-guild-hero__words">
            <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
              {guild.name}
            </h1>
            {guild.motto ? <p className="body-lg pk-muted">{guild.motto}</p> : null}
            <Row gap={2} wrap style={{ marginTop: "var(--space-3)", alignItems: "center" }}>
              <GuildRole guild={guild} />
              <Chip label={`${guild.memberCount} ${guild.memberCount === 1 ? "pet" : "pets"}`} tone="pool" icon="users" />
              <Chip label="Optional" tone="bloom" icon="guild" />
              <Chip label={`Since ${since(guild.createdAt)}`} tone="plain" />
            </Row>
            <div className="pk-guild-hero__join">
              {delisted ? null : <GuildMembership guild={{ address: guild.address, name: guild.name }} />}
              <ShareButton name={guild.name} label="Share this guild" text={`${guild.name}: an optional guild of pets on Pawket, kept on Solana.`} />
            </div>
          </div>
        </header>

        {delisted ? (
          <Banner
            tone="risk"
            title="Pawket no longer shows this guild"
            body="Pawket stopped promoting it under its guild rule. It is still on Solana, and Pawket cannot remove it, take a pet out of it or undo anything it did."
          />
        ) : null}

        <div className="pk-columns">
          <div className="pk-columns__first">
            {delisted ? null : (
              <GuildGatherings guild={{ address: guild.address, name: guild.name, founder: guild.founder }} events={gatherings.events} polls={gatherings.polls} />
            )}
          </div>

          <aside className="pk-columns__second" aria-label={`About ${guild.name}`}>
            <section className="pk-guild-side" aria-labelledby="pk-guild-pets">
              <div className="pk-spread">
                <h2 id="pk-guild-pets" className="title">
                  The pets
                </h2>
                {outToday > 0 ? <Presence name={`${outToday} out today`} /> : <span className="caption pk-faint">Nobody out yet today</span>}
              </div>
              {records.length === 0 ? (
                <p className="body-sm pk-muted">Nobody here yet. A guild with nobody in it is still on the record; the next pet to join is its first.</p>
              ) : (
                <ul className="pk-pet-rows">
                  {records.map(({ entry, record }) => {
                    const { level, mood } = projectGuestPet(record, now);
                    const out = streakAsOf(record.streak, now).activeToday;
                    return (
                      <li key={entry.pet.address}>
                        <Link href={`/pet/${entry.pet.address}`} className="pk-pet-row" transitionTypes={["nav-forward"]}>
                          <span className={`pk-avatar ${SKY_CLASS[SPECIES_SKY[record.species]]}`} aria-hidden="true">
                            <PetArt {...petLook(record, mood)} still />
                          </span>
                          <span className="pk-fill">
                            <span className="title">
                              {entry.pet.name}
                              {holders?.has(entry.pet.owner) ? (
                                <span className="pk-coin-pin" title={`Wears ${guild.name}'s crest pin: its owner holds the coin`}>
                                  <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="sm" />
                                  <span className="pk-sr">, wears the crest pin</span>
                                </span>
                              ) : null}
                            </span>
                            <span className="caption pk-faint">
                              Level {level}
                              {entry.pet.address === guild.founderPet ? " · founder" : ""}
                            </span>
                          </span>
                          {out ? <span className="pk-presence__dot" title="Out today" aria-label="Out today" /> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <dl className="pk-stat-row" aria-label="Together">
                <div>
                  <dt className="label pk-faint">Cares given</dt>
                  <dd className="amount">{cares}</dd>
                </div>
                <div>
                  <dt className="label pk-faint">Longest run</dt>
                  <dd className="amount">
                    {bestRun}
                    <span className="caption pk-faint"> {bestRun === 1 ? "day" : "days"}</span>
                  </dd>
                </div>
                <div>
                  <dt className="label pk-faint">Out today</dt>
                  <dd className="amount">{outToday}</dd>
                </div>
              </dl>
              <p className="caption pk-faint">Counted from each pet&apos;s own Passport. A guild keeps no score, and none of it changes a pet.</p>
            </section>

            {coin ? <CoinCard guildName={guild.name} slug={guild.slug} coin={coin} /> : null}

            <details className="pk-fold">
              <summary>
                <span className="title">On the record</span>
                <span className="caption pk-faint">Solana {cluster}</span>
              </summary>
              <Stack gap={3}>
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
                <p className="body-sm pk-muted">
                  Each pet joins and leaves with its owner&apos;s signature. Pawket cannot add a pet, remove one or change the
                  guild. Shared, this page&apos;s link is also a Solana Action: in a Blink-aware wallet it opens as{" "}
                  {guild.name}&apos;s card, and a pet joins from there.
                </p>
                <p className="caption pk-faint">
                  Something wrong here — impersonation, a scam link, abuse?{" "}
                  <a href={guildReportUrl(guild, `${getPublicEnv().appUrl}/guilds/${guild.slug}`)}>
                    Report {guild.name}
                  </a>
                  . Pawket can stop promoting a guild; it cannot remove one from Solana.
                </p>
              </Stack>
            </details>
          </aside>
        </div>
      </Stack>
    </Screen>
  );
}

const SKY_CLASS = { warm: "pk-sky--warm", cool: "pk-sky", plain: "pk-sky--plain" } as const;

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

function CoinCard({ guildName, slug, coin }: { guildName: string; slug: string; coin: CoinState }) {
  return (
    <Card variant="quiet">
      <div className="pk-spread">
        <h2 className="title">{coin.stage === "none" ? "A coin, if it wants one" : coin.name}</h2>
        <ButtonLink label={coin.stage === "none" ? "How it works" : "Open"} href={`/guilds/${slug}/coin`} tone="ghost" size="sm" after="right" transitionTypes={["nav-forward"]} />
      </div>
      <div style={{ marginTop: "var(--space-2)" }}>
        <LaunchStage stage={coin.stage} />
      </div>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        {COIN_LINE[coin.stage](guildName)}
      </p>
    </Card>
  );
}
