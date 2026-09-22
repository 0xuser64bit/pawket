import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  Banner,
  ButtonLink,
  Card,
  Chip,
  ChipLink,
  Columns,
  Meter,
  PawLoader,
  PetArt,
  Presence,
  Row,
  Screen,
  SectionLabel,
  Stack,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { ACTIVE_PET, PRESENCE, findDemoGame } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

const CHEERS = ["Nice one", "Go go go", "Oops", "Wait for me"];

/** Three racers along the hedgerow, sized from the field's height. */
const RACERS = [
  { form: SPECIES_ART[ACTIVE_PET.species], left: "6%", width: "33.5cqh" },
  { form: "dog", left: "37%", width: "27.5cqh" },
  { form: "bun", left: "64%", width: "26.3cqh" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ game: string }>;
}): Promise<Metadata> {
  const { game } = await params;
  return { title: findDemoGame(game)?.name ?? "Playground" };
}

/**
 * A round, and the wait in front of it. The fairness note ships inside the
 * game rather than on a policy page — in the plain info banner, not a hue
 * that argues.
 */
export default async function RoundPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { game: key } = await params;
  const { state } = await searchParams;
  const game = findDemoGame(key);
  if (!game) notFound();

  const pet = ACTIVE_PET;
  const finding = state === "finding";

  if (finding) {
    return (
      <Screen width="narrow">
        <BackLink label="Playground" href="/playground" />
        <Stack gap={5}>
          <div style={{ display: "grid", placeItems: "center", paddingTop: "var(--space-6)" }}>
            {/* A wait with no known end, in the Playroom: the loader's one home. */}
            <PawLoader size="lg" label={`Finding a ${game.name} lobby`} />
          </div>
          <div style={{ textAlign: "center" }}>
            <h1 className="display-m">Finding a lobby</h1>
            <p className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
              {game.name} takes four pets. You keep your place while you wait, and leaving costs
              nothing.
            </p>
          </div>
          <Row gap={4} wrap style={{ justifyContent: "center" }}>
            {PRESENCE.slice(0, 3).map((person) => (
              <Presence key={person.name} name={person.name} note={person.note} away={person.away} />
            ))}
          </Row>
          <ButtonLink label="Stop looking" href="/playground" tone="quiet" full />
          <StateSwitch gameKey={game.key} finding={finding} />
          <PreviewNote what="No lobby is being searched for — this is the loader in its one Playroom home." />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackLink label="Playground" href="/playground" />

      <Columns
        first={
          <>
            <div className="pk-spread">
              <h1>
                <Chip label={game.name} tone="pool" icon="ball" />
              </h1>
              <span className="amount">0:47</span>
            </div>

            <Meter label="Hedgerow" value={4} max={8} tone="pool" readout="4 of 8 gates" slim />

            <div className="pk-field-of-play">
              <div className="pk-field-of-play__ground" />
              {RACERS.map((racer, index) => (
                <div
                  key={racer.left}
                  className="pk-field-of-play__racer"
                  style={{ left: racer.left, width: racer.width, opacity: index ? 0.9 : undefined }}
                >
                  <PetArt form={racer.form} />
                </div>
              ))}
              <div style={{ position: "absolute", left: "var(--space-4)", top: "var(--space-3)" }}>
                <Chip label={`${pet.name} · 1st`} tone="sun" />
              </div>
              <span className="pk-sr">Three pets running the hedgerow. {pet.name} is first.</span>
            </div>

            <Card variant="quiet">
              <Row gap={2} wrap>
                {CHEERS.map((cheer) => (
                  <Chip key={cheer} label={cheer} />
                ))}
              </Row>
            </Card>
          </>
        }
        second={
          <>
            <Banner
              tone="info"
              title="Nothing here can be bought"
              body="Speed, handling and scoring come from the game alone. No cosmetic, token or balance changes a single one."
            />

            <StateSwitch gameKey={game.key} finding={finding} />

            <PreviewNote what="This round is a fixture — the timer does not run and no score is kept." />
          </>
        }
      />
    </Screen>
  );
}

/** Both halves of the wait, so each can be reviewed. */
function StateSwitch({ gameKey, finding }: { gameKey: string; finding: boolean }) {
  return (
    <div>
      <SectionLabel>Preview states</SectionLabel>
      <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
        <ChipLink label="Finding a lobby" href={`/playground/${gameKey}?state=finding`} selected={finding} />
        <ChipLink label="In the round" href={`/playground/${gameKey}`} selected={!finding} />
      </Row>
    </div>
  );
}
