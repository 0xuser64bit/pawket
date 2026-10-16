import type { Metadata } from "next";
import { NavLink as Link } from "@/components/pk/nav-link";
import {
  ReadFailure,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  Icon,
  PetArt,
  PetFrame,
  Presence,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  type IconName,
} from "@/components/pk";
import { ParkScene, PARK_CAPACITY, type ParkPet } from "@/components/park/park-scene";
import { CareActionType } from "@/lib/game/enums";
import { CARE_SEEN, MOOD_LABEL, SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { formatAgo } from "@/lib/utils/format";
import { projectGuestPet, streakAsOf, utcDay } from "@/lib/guest/pet";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { getPublicEnv } from "@/config/env";
import { AdoptLink } from "@/components/park/adopt-link";
import { readAllPets, readGuilds } from "@/server/solana";
import { GuildCrest } from "@/components/guilds/guild-crest";
import { isListed } from "@/lib/guilds/delisted";
import type { ChainGuild } from "@/lib/solana/accounts";

export const metadata: Metadata = {
  title: "Park",
  description: "Every pet kept on Solana in Pawket, read live from the chain.",
};
export const dynamic = "force-dynamic";

/**
 * Where pets on Solana are seen by everyone: read live from the program,
 * nothing ranked by money because nothing here has a price. Who was out
 * today comes first; then everyone, most cared-for first.
 */
const CARE_ICON: Record<CareActionType, IconName> = {
  [CareActionType.Feed]: "bowl",
  [CareActionType.Play]: "ball",
  [CareActionType.Groom]: "heart",
  [CareActionType.Rest]: "clock",
};

/** The park shows this many of everyone at first — three rows of six — the most cared for. The rest are a tap away. */
const FIRST_LOOK = 18;

export default async function ParkPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const all = (await searchParams).all === "1";
  let pets: PetOnChain[];
  let guilds = new Map<string, ChainGuild>();
  try {
    pets = await readAllPets();
    // Each pet's guild, by its address: the crest beside its name. A guild list
    // that does not come back is a park without crests, not a failure.
    guilds = new Map((await readGuilds().catch(() => [])).filter(isListed).map((guild) => [guild.address, guild]));
  } catch {
    return (
      <Screen>
        <ScreenBar>
          <h1 className="display-l">Park</h1>
        </ScreenBar>
        <ReadFailure body="This page could not read the pets just now. Trying again only reads their records." />
      </Screen>
    );
  }

  const now = new Date();
  const today = utcDay(now);
  const shown = pets
    .map((entry) => {
      const record = toCompanionRecord(entry);
      const projected = projectGuestPet(record, now);
      return { entry, record, projected, streak: streakAsOf(record.streak, now), out: record.streak.lastDay === today };
    })
    .sort((a, b) => b.entry.passport.careCount - a.entry.passport.careCount || b.record.xp - a.record.xp);
  const outToday = shown.filter(({ out }) => out);
  const looks = new Map(shown.map(({ entry, record, projected }) => [entry.pet.address, petLook(record, projected.mood)]));
  // Out today first, then the most cared for: the ones in the park right now.
  const scene: ParkPet[] = [...outToday, ...shown.filter(({ out }) => !out)].slice(0, PARK_CAPACITY).map(({ entry, out }) => ({
    address: entry.pet.address,
    name: entry.pet.name,
    look: looks.get(entry.pet.address)!,
    out,
  }));
  const cares = pets.reduce((sum, { passport }) => sum + passport.careCount, 0);
  // Every Passport keeps its last eight cares: together, what just happened in the park.
  const lately = pets
    .flatMap(({ pet, passport }) => passport.recent.map((mark) => ({ pet, ...mark })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Park</h1>
          <p className="caption pk-faint">
            Every pet kept on Solana, read live · <Link href="/pulse">Pawket&apos;s pulse</Link>
          </p>
        </div>
        <Chip label={`${pets.length} ${pets.length === 1 ? "pet" : "pets"}`} tone="pool" icon="users" />
      </ScreenBar>

      {pets.length === 0 ? (
        <EmptyState
          icon="users"
          title="Nobody is out yet"
          body="A pet comes to the park once it is kept on Solana. Adopt one, then record it from your room."
          action={<ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />}
        />
      ) : (
        <Stack gap={6}>
          <div>
            <ParkScene pets={scene} />
            <div className="pk-parkstrip">
              <dl className="pk-parkstrip__facts">
                <div>
                  <dt className="label pk-faint">Pets kept</dt>
                  <dd className="pk-parkfact__n">{pets.length}</dd>
                </div>
                <div>
                  <dt className="label pk-faint">Out today</dt>
                  <dd className="pk-parkfact__n">{outToday.length}</dd>
                </div>
                <div>
                  <dt className="label pk-faint">Cares recorded</dt>
                  <dd className="pk-parkfact__n">{cares}</dd>
                </div>
              </dl>
              <div className="pk-parkstrip__share">
                <AdoptLink url={new URL("/adopt", getPublicEnv().appUrl).toString()} />
                <span className="caption pk-faint">Posted where a Blink-aware wallet reads, it adopts straight onto Solana.</span>
              </div>
            </div>
            <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
              {outToday.length > 0
                ? `${outToday.length} out today, in UTC, name tags in blue. Tap one for their record.`
                : "Nobody has been cared for yet today, in UTC. These are the most cared for; the first care of the day brings a pet out."}
            </p>
          </div>

          {lately.length > 0 ? (
            <section aria-labelledby="pk-lately">
              <SectionLabel>
                <span id="pk-lately">Lately</span>
              </SectionLabel>
              <ul className="pk-feed pk-feed--wide">
                {lately.map((mark) => {
                  const look = looks.get(mark.pet.address);
                  return (
                    <li key={`${mark.pet.address}-${mark.at}-${mark.action}`}>
                      <Link href={`/pet/${mark.pet.address}`} className="pk-feed__row" transitionTypes={["nav-forward"]}>
                        <span className="pk-avatar" aria-hidden="true">
                          {look ? <PetArt {...look} still /> : null}
                        </span>
                        <span className="body-sm pk-feed__what">{CARE_SEEN[mark.action](mark.pet.name)}</span>
                        <span className="pk-feed__icon" aria-hidden="true">
                          <Icon name={CARE_ICON[mark.action]} size={16} />
                        </span>
                        <span className="caption pk-faint">{formatAgo(now.getTime() / 1000 - mark.at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
                Each line is a transaction signed by the pet&apos;s owner.
              </p>
            </section>
          ) : null}

          <Stack gap={3}>
            <span id="everyone" className="pk-anchor" />
            <SectionLabel count={all || shown.length <= FIRST_LOOK ? `${pets.length}` : `${FIRST_LOOK} of ${pets.length}`}>
              Everyone
            </SectionLabel>
            <div className="pk-cards pk-cards--dense">
              {(all ? shown : shown.slice(0, FIRST_LOOK)).map(({ entry, record, projected, streak, out }) => (
                <Card key={entry.pet.address} href={`/pet/${entry.pet.address}`} variant="flush">
                  <div className="pk-card__art">
                    <PetFrame
                      {...petLook(record, projected.mood)}
                      sky={SPECIES_SKY[entry.pet.species]}
                      level={projected.level}
                      mood={MOOD_LABEL[projected.mood]}
                      size="fluid"
                      still
                    />
                  </div>
                  <div className="pk-card__body">
                    <h2 className="title" style={{ overflowWrap: "anywhere" }}>{entry.pet.name}</h2>
                    {entry.member && guilds.get(entry.member.guild) ? (
                      <span className="pk-park-guild">
                        <GuildCrest
                          crest={guilds.get(entry.member.guild)!.crest}
                          colour={guilds.get(entry.member.guild)!.colour}
                          name={guilds.get(entry.member.guild)!.name}
                          size="sm"
                        />
                        <span className="caption pk-faint">{guilds.get(entry.member.guild)!.name}</span>
                      </span>
                    ) : null}
                    <p className="caption pk-faint">
                      Level {projected.level}
                      <span className="pk-park-kind"> · {SPECIES_LABEL[entry.pet.species]}</span>
                    </p>
                    <p className="caption pk-faint pk-park-cares">
                      {entry.passport.careCount} {entry.passport.careCount === 1 ? "care" : "cares"}
                      {streak.count > 0 ? ` · ${streak.count}-day run` : ""}
                    </p>
                    {out ? (
                      <div style={{ marginTop: "var(--space-2)" }}>
                        <Presence name="Out today" />
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
            {!all && shown.length > FIRST_LOOK ? (
              <div className="pk-park-more">
                <ButtonLink label={`See all ${pets.length}`} href="/park?all=1#everyone" tone="quiet" icon="users" />
              </div>
            ) : null}
          </Stack>

        </Stack>
      )}
    </Screen>
  );
}
