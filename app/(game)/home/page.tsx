import type { Metadata } from "next";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Columns,
  Meter,
  Row,
  Screen,
  ScreenBar,
  Stack,
} from "@/components/pk";
import { GuestRoom } from "@/components/home/guest-room";
import { Room } from "@/components/home/room";
import { PreviewNote } from "@/components/preview-note";
import { ACTIVE_PET, PLAYER } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export const metadata: Metadata = { title: "Home" };

const EMOTES = ["Hello", "Good girl", "Nap?", "Dance", "Snack", "Come here"];

/**
 * Home is a place, not a dashboard. The order is the room, then care, then
 * anything that explains it — and nothing is drawn over the animal.
 *
 * With a guest pet adopted, the room is that pet and the care loop is real.
 * Without one, it is the design fixture, and it says so.
 */
export default function HomePage() {
  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-s">{PLAYER.placeName}</h1>
          <p className="caption pk-faint">Afternoon · window open</p>
        </div>
        <Chip label="Guest" icon="paw" />
      </ScreenBar>

      <GuestRoom fallback={<FixtureRoom />} />
    </Screen>
  );
}

function FixtureRoom() {
  const pet = ACTIVE_PET;
  const { fed, played, brushed, perDay } = pet.care;
  const left = perDay * 3 - (fed + played + brushed);

  return (
    <Columns
      pin
      first={
        <>
          <Room
            form={SPECIES_ART[pet.species]}
            description={`${PLAYER.name} and ${pet.name} in the room, window open.`}
          />
          <Row gap={2} wrap>
            <Chip label="Porch tape" tone="sun" icon="music" />
            <Chip label="Window seat" icon="image" />
          </Row>
        </>
      }
      second={
        <>
          <Card>
            <div className="pk-spread" style={{ marginBottom: "var(--space-4)" }}>
              <h2 className="title">Today with {pet.name}</h2>
              <span className="amount-sm pk-faint">{left} left</span>
            </div>
            <Stack gap={3}>
              <Meter label="Fed" value={fed} max={perDay} />
              <Meter label="Played" value={played} max={perDay} />
              <Meter label="Brushed" value={brushed} max={perDay} />
            </Stack>
            <Row gap={2} wrap style={{ marginTop: "var(--space-4)" }}>
              <Button label="Feed" icon="bowl" size="sm" disabled />
              <Button label="Play" icon="ball" size="sm" tone="sprout" disabled />
              <Button label="Brush" icon="heart" size="sm" tone="quiet" disabled />
            </Row>
          </Card>

          <Card>
            <div className="pk-spread" style={{ marginBottom: "var(--space-3)" }}>
              <h2 className="title">Say something</h2>
              <span className="caption pk-faint">{pet.name} is listening</span>
            </div>
            <Row gap={2} wrap>
              {EMOTES.map((emote) => (
                <Chip key={emote} label={emote} />
              ))}
            </Row>
          </Card>

          <Card variant="quiet">
            <h2 className="title">No pet of your own yet</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              Adopting takes three taps and no wallet. Once you have one, this room becomes theirs
              and the care loop above starts working.
            </p>
            <div style={{ marginTop: "var(--space-4)" }}>
              <ButtonLink label="Adopt a pet" href="/adopt" size="sm" icon="paw" />
            </div>
          </Card>

          <PreviewNote what="Pepper, her care counts and the room are fixtures, so the care controls are off." />
        </>
      }
    />
  );
}
