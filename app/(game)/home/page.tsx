import type { Metadata } from "next";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  Meter,
  PetArt,
  PlayerArt,
  Row,
  Screen,
  ScreenBar,
  Stack,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { ACTIVE_PET, PLAYER } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export const metadata: Metadata = { title: "Home" };

const EMOTES = ["Hello", "Good girl", "Nap?", "Dance", "Snack", "Come here"];

/**
 * Home is a place, not a dashboard. The order is the room, then care, then
 * anything that explains it — and nothing is drawn over the animal.
 */
export default function HomePage() {
  const pet = ACTIVE_PET;
  const { fed, played, brushed, perDay } = pet.care;
  const left = perDay * 3 - (fed + played + brushed);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-s">{PLAYER.placeName}</h1>
          <p className="caption pk-faint">Afternoon · window open</p>
        </div>
        <Chip label="Guest" icon="paw" />
      </ScreenBar>

      <Stack gap={4}>
        <div className="pk-room pk-sky--warm">
          <div className="pk-room__win" />
          <div className="pk-room__floor" />
          <div className="pk-room__who">
            <PlayerArt color={PLAYER.color} hat={PLAYER.hat} />
          </div>
          <div className="pk-room__pet">
            <PetArt form={SPECIES_ART[pet.species]} />
          </div>
          <span className="pk-sr">
            {PLAYER.name} and {pet.name} in the room, window open.
          </span>
        </div>

        <Row gap={2} wrap>
          <Chip label="Porch tape" tone="sun" icon="music" />
          <Chip label="Window seat" icon="image" />
        </Row>

        <Card>
          <div className="pk-spread" style={{ marginBottom: "var(--space-4)" }}>
            <span className="title">Today with {pet.name}</span>
            <span className="amount-sm pk-faint">{left} left</span>
          </div>
          <Stack gap={3}>
            <Meter label="Fed" value={fed} max={perDay} />
            <Meter label="Played" value={played} max={perDay} />
            <Meter label="Brushed" value={brushed} max={perDay} />
          </Stack>
          {/* Care and growth actions are sprout; the screen's one sun fill
              is the primary act, which on Home is feeding her. */}
          <Row gap={2} wrap style={{ marginTop: "var(--space-4)" }}>
            <Button label="Feed" icon="bowl" size="sm" />
            <Button label="Play" icon="ball" size="sm" tone="sprout" />
            <Button label="Brush" icon="heart" size="sm" tone="quiet" />
          </Row>
        </Card>

        <Card>
          <div className="pk-spread" style={{ marginBottom: "var(--space-3)" }}>
            <span className="title">Say something</span>
            <span className="caption pk-faint">{pet.name} is listening</span>
          </div>
          <Row gap={2} wrap>
            {EMOTES.map((emote) => (
              <Chip key={emote} label={emote} />
            ))}
          </Row>
        </Card>

        <Card variant="quiet">
          <div className="pk-spread">
            <span className="title">{pet.name}</span>
            <ButtonLink label="Her profile" href={`/pet/${pet.id}`} tone="ghost" size="sm" after="right" />
          </div>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            Level {pet.level} · {pet.xpIntoLevel} / {pet.xpForNext} XP · {pet.careStreakDays}-day care streak.
          </p>
        </Card>

        <PreviewNote what="Pepper, her care counts and the room are fixtures." />
      </Stack>
    </Screen>
  );
}
