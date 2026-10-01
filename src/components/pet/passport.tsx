import {
  BackLink,
  Card,
  Chip,
  Columns,
  Meter,
  Paper,
  PetFrame,
  Row,
  Screen,
  Stack,
} from "@/components/pk";
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
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { formatUtcDate } from "@/lib/utils/format";
import type { Keepsake } from "@/server/keepsake";
import { KeepsakeCard } from "./keepsake";
import { OwnerActions } from "./owner-actions";
import { ShareButton } from "./share-button";

const days = (count: number) => `${count} ${count === 1 ? "day" : "days"}`;

/**
 * A pet kept on Solana, as anyone can see it: everything the pet is, then,
 * on Paper, what it is on chain. Read live from the program's accounts at
 * request time — nothing here is cached, kept or guessed by Pawket.
 */
export function Passport({
  onChain,
  now,
  keepsake,
  canKeep,
}: {
  onChain: PetOnChain;
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
          <div className="pk-portrait">
            <PetFrame
              {...petLook(record, projected.mood)}
              sky={SPECIES_SKY[pet.species]}
              size="lg"
              level={projected.level}
              mood={MOOD_LABEL[projected.mood]}
            />
          </div>
        }
        second={
          <>
            <div>
              <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
                {pet.name}
              </h1>
              <p className="body-sm pk-muted">
                {SPECIES_LABEL[pet.species]} · {PERSONALITY_LABEL[pet.personality]} · adopted{" "}
                {formatUtcDate(record.createdAt)}
              </p>
            </div>

            <Row gap={2} wrap>
              <Chip label="On Solana" tone="pool" />
              <Chip label={PERSONALITY_LABEL[pet.personality]} />
              {worn ? <Chip label={worn.name} icon={worn.icon} /> : null}
            </Row>

            <Row gap={2} wrap>
              <OwnerActions owner={pet.owner} address={pet.address} name={pet.name} />
              <ShareButton name={pet.name} />
            </Row>
            <p className="caption pk-faint" style={{ marginTop: "calc(-1 * var(--space-2))" }}>
              Shared, this link is also a Solana Action: in a Blink-aware wallet it opens as {pet.name}&apos;s
              card, where the owner can care without coming here.
            </p>

            {keepsake && (keepsake.made || canKeep) ? (
              <KeepsakeCard owner={pet.owner} pet={pet.address} name={pet.name} made={keepsake.made} />
            ) : null}

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
              <h2 className="title">Last cares</h2>
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
              <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
                The Passport keeps the last eight; every one is a transaction anyone can look up.
              </p>
            </Card>

            <Paper title="On the record" meta={`Solana ${cluster}`}>
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
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
                The owner is the only wallet that can care for {pet.name}. Pawket cannot edit this record,
                and cannot take it away.
              </p>
            </Paper>
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
