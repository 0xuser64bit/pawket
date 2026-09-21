import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  Banner,
  ButtonLink,
  Card,
  Chip,
  ChipLink,
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

  return (
    <Screen>
      <BackLink label="Playground" href="/playground" />

      {finding ? (
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
      ) : (

      <Stack gap={4}>
        <div className="pk-spread">
          <Chip label={game.name} tone="pool" icon="ball" />
          <span className="amount">0:47</span>
        </div>

        <Meter label="Hedgerow" value={4} max={8} tone="pool" readout="4 of 8 gates" slim />

        <div className="pk-field-of-play">
          <div className="pk-field-of-play__ground" />
          <div className="pk-field-of-play__racer" style={{ left: "6%", width: "28%" }}>
            <PetArt form={SPECIES_ART[pet.species]} />
          </div>
          <div className="pk-field-of-play__racer" style={{ left: "37%", width: "23%", opacity: 0.9 }}>
            <PetArt form="dog" />
          </div>
          <div className="pk-field-of-play__racer" style={{ left: "64%", width: "22%", opacity: 0.9 }}>
            <PetArt form="bun" />
          </div>
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

        <Banner
          tone="info"
          title="Nothing here can be bought"
          body="Speed, handling and scoring come from the game alone. No cosmetic, token or balance changes a single one."
        />

        <StateSwitch gameKey={game.key} finding={finding} />

        <PreviewNote what="This round is a fixture — the timer does not run and no score is kept." />
      </Stack>
      )}
    </Screen>
  );
}

/** Both halves of the wait, so each can be reviewed. */
function StateSwitch({ gameKey, finding }: { gameKey: string; finding: boolean }) {
  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <SectionLabel>Preview states</SectionLabel>
      <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
        <ChipLink label="Finding a lobby" href={`/playground/${gameKey}?state=finding`} selected={finding} />
        <ChipLink label="In the round" href={`/playground/${gameKey}`} selected={!finding} />
      </Row>
    </div>
  );
}
