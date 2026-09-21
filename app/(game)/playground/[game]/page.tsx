import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  Banner,
  Card,
  Chip,
  Meter,
  PetArt,
  Row,
  Screen,
  Stack,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { ACTIVE_PET, findDemoGame } from "@/lib/demo";
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
 * A round. The fairness note ships inside the game rather than on a policy
 * page — in the plain info banner, not a hue that argues.
 */
export default async function RoundPage({ params }: { params: Promise<{ game: string }> }) {
  const { game: key } = await params;
  const game = findDemoGame(key);
  if (!game) notFound();

  const pet = ACTIVE_PET;

  return (
    <Screen>
      <BackLink label="Playground" href="/playground" />

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

        <PreviewNote what="This round is a fixture — the timer does not run and no score is kept." />
      </Stack>
    </Screen>
  );
}
