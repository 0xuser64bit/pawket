import { BackLink, ButtonLink, Card, Chip, Columns, Meter, PetFrame, Row, Screen, Stack } from "@/components/pk";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { findWearable } from "@/lib/closet/catalog";
import {
  CARE_DONE_LABEL,
  MOOD_LABEL,
  PERSONALITY_LABEL,
  SPECIES_LABEL,
  SPECIES_SKY,
  petLook,
} from "@/lib/game/appearance";
import { projectGuestPet, streakAsOf } from "@/lib/guest/pet";
import { toCompanionRecord, type ChainGuestbook, type ChainGuild, type PetOnChain } from "@/lib/solana/accounts";
import { GuildCrest } from "@/components/guilds/guild-crest";
import Link from "next/link";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { formatUtcDate } from "@/lib/utils/format";
import type { Keepsake } from "@/server/keepsake";
import { Guestbook } from "./guestbook";
import { KeepsakeCard } from "./keepsake";
import { OwnerActions } from "./owner-actions";
import { ShareButton } from "./share-button";
import { StickerStrip } from "./sticker-strip";

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

/**
 * A pet kept on Solana, as anyone can see it. Beside the record, its ID card
 * stays in view: the portrait, the name, its guild and what you can do —
 * visit, share, care if it is yours. The record is the page: the level and
 * the days in a row, the last cares, the guestbook, the stickers; what it is
 * on chain folds away. Read live from the program's accounts at request
 * time — nothing here is cached, kept or guessed by Pawket.
 */
export function Passport({
  onChain,
  now,
  keepsake,
  canKeep,
  guild = null,
  guestbook = null,
  gatherings = 0,
}: {
  /** Guild events the pet checked in at. */
  gatherings?: number;
  onChain: PetOnChain;
  /** Who waved at the pet, or null before anyone has. */
  guestbook?: ChainGuestbook | null;
  /** The guild the pet is in, read from chain, or null. */
  guild?: ChainGuild | null;
  now: Date;
  /** The pet's card, where keepsakes are on. */
  keepsake: Keepsake | null;
  /** Whether Pawket can pay for a new card right now. */
  canKeep: boolean;
}) {
  const { pet, passport } = onChain;
  const record = toCompanionRecord(onChain);
  const projected = projectGuestPet(record, now);
  const streak = streakAsOf(record.streak, now);
  const worn = findWearable(record.wearing);
  const cluster = getPublicEnv().solanaCluster;
  const history = [...record.careLog].reverse();

  return (
    <Screen>
      <BackLink label="Pets on Solana" href="/park" />

      <Columns
        split="portrait"
        pin
        first={
          <div className="pk-passport-id">
            <div className="pk-portrait">
              <PetFrame
                {...petLook(record, projected.mood)}
                sky={SPECIES_SKY[pet.species]}
                size="lg"
                level={projected.level}
                mood={MOOD_LABEL[projected.mood]}
              />
            </div>
            <div>
              <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
                {pet.name}
              </h1>
              <p className="body-sm pk-muted">
                {SPECIES_LABEL[pet.species]} · {PERSONALITY_LABEL[pet.personality]} · adopted {formatUtcDate(record.createdAt)}
              </p>
            </div>
            <Row gap={2} wrap>
              <Chip label="On Solana" tone="pool" icon="check" />
              {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
            </Row>
            {guild ? (
              <Link href={`/guilds/${guild.slug}`} className="pk-guild-tag" transitionTypes={["nav-forward"]}>
                <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="sm" />
                <span>
                  <span className="caption pk-faint" style={{ display: "block" }}>
                    In a guild
                  </span>
                  <span className="title">{guild.name}</span>
                </span>
              </Link>
            ) : null}
            <div className="pk-acts">
              <OwnerActions owner={pet.owner} address={pet.address} name={pet.name} />
              <ButtonLink label={`Visit ${pet.name}`} href={`/pet/${pet.address}/visit`} icon="home" tone="quiet" size="sm" transitionTypes={["nav-forward"]} />
              <ShareButton
                name={pet.name}
                label={`Share ${pet.name}'s record`}
                image={`/pet/${pet.address}/opengraph-image`}
                text={`${pet.name}, a ${SPECIES_LABEL[pet.species].toLowerCase()} kept on Solana in Pawket. Wave hello.`}
              />
            </div>
          </div>
        }
        second={
          <>
            <Card>
              <Stack gap={3}>
                <Meter
                  label={`Level ${projected.level}`}
                  value={Math.round(projected.xpIntoLevel / 10)}
                  max={10}
                  readout={`${projected.xpIntoLevel} / ${projected.xpForNext} XP`}
                />
                <Meter
                  label="Days in a row"
                  value={Math.min(streak.count, 7)}
                  max={7}
                  readout={streak.count === 0 ? "Not today yet" : days(streak.count)}
                />
              </Stack>
              <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
                {passport.careCount} {passport.careCount === 1 ? "care" : "cares"}, {passport.plays}{" "}
                {passport.plays === 1 ? "round" : "rounds"}. Longest run: {days(passport.bestStreak)}. Mood and
                level are worked out from the record, the same way the program does.
              </p>
            </Card>

            <Card>
              <div className="pk-spread">
                <h2 className="title">Last cares</h2>
                <span className="caption pk-faint">The last eight, each a transaction</span>
              </div>
              {history.length === 0 ? (
                <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
                  No care yet. The first feed, game, brush or rest is written here, on chain.
                </p>
              ) : (
                <ul className="pk-log">
                  {history.map((entry) => (
                    <li key={`${entry.at}-${entry.action}`}>
                      <span>{CARE_DONE_LABEL[entry.action]}</span>
                      <span className="caption pk-faint">
                        {formatUtcDate(entry.at)} · +{entry.xpGained} XP
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Guestbook
              pet={pet.address}
              owner={pet.owner}
              name={pet.name}
              waves={guestbook?.waves ?? 0}
              recent={guestbook?.recent ?? []}
              today={Math.floor(now.getTime() / 86_400_000)}
            />

            <StickerStrip
              name={pet.name}
              record={record}
              context={{ onChain: true, guild: Boolean(onChain.member), waves: guestbook?.waves ?? 0, gatherings }}
            />

            {keepsake && (keepsake.made || canKeep) ? (
              <KeepsakeCard owner={pet.owner} pet={pet.address} name={pet.name} made={keepsake.made} />
            ) : null}

            <details className="pk-fold">
              <summary>
                <span className="title">On the record</span>
                <span className="caption pk-faint">Solana {cluster}</span>
              </summary>
              <Stack gap={3}>
                <div className="pk-receipt">
                  <Fact k="Owner" value={pet.owner} cluster={cluster} />
                  <Fact k="Pet account" value={pet.address} cluster={cluster} />
                  <Fact k="Passport" value={passport.address} cluster={cluster} />
                  <Fact k="Program" value={PAWKET_PROGRAM_ID} cluster={cluster} />
                  {keepsake?.made ? <Fact k="Keepsake" value={keepsake.address} cluster={cluster} /> : null}
                  <div className="pk-receipt__row">
                    <span className="pk-receipt__k">Adopted</span>
                    <span className="pk-receipt__v">{formatUtcDate(record.createdAt)}</span>
                  </div>
                  <div className="pk-receipt__row">
                    <span className="pk-receipt__k">Events</span>
                    <span className="pk-receipt__v">{passport.eventCount}</span>
                  </div>
                </div>
                <p className="body-sm pk-muted">
                  The owner is the only wallet that can care for {pet.name}. Pawket cannot edit this record, and cannot
                  take it away. Shared, this page&apos;s link is also a Solana Action: in a Blink-aware wallet it opens
                  as {pet.name}&apos;s card, where the owner can care without coming here.
                </p>
              </Stack>
            </details>
          </>
        }
      />
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
