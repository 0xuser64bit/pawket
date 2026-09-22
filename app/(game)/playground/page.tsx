import type { Metadata } from "next";
import {
  Banner,
  ButtonLink,
  Card,
  Chip,
  Columns,
  Icon,
  PetArt,
  Presence,
  Row,
  Screen,
  ScreenBar,
  Well,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { ACTIVE_PET, DEMO_GAMES, PRESENCE } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export const metadata: Metadata = { title: "Playground" };

/**
 * Out here a pet is the player's face. Pool is the social hue: lobbies,
 * presence, player counts and confirmed facts all share it.
 */
export default function PlaygroundPage() {
  const pet = ACTIVE_PET;

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Playground</h1>
        <Chip label={`Level ${pet.level}`} tone="sprout" icon="spark" />
      </ScreenBar>

      <Columns
        pin
        first={
          <>
            <Card variant="ink">
              <Row gap={4}>
                <div className="pk-ready__pet">
                  <PetArt form={SPECIES_ART[pet.species]} />
                </div>
                <div className="pk-fill">
                  <h2 className="display-s" style={{ color: "var(--ink-inverse)" }}>
                    {pet.name} is ready
                  </h2>
                  <p className="body-sm pk-muted">
                    Wearing {pet.wearing.map((w) => w.name.toLowerCase()).join(" and ") || "nothing yet"}
                  </p>
                </div>
              </Row>
              <div style={{ marginTop: "var(--space-4)" }}>
                <ButtonLink
                  label="Quick match"
                  href={`/playground/${DEMO_GAMES[0].key}`}
                  tone="pool"
                  full
                  icon="ball"
                />
              </div>
            </Card>

            <Well>
              <h2 className="label pk-faint" style={{ marginBottom: "var(--space-3)" }}>
                Around right now
              </h2>
              <Row gap={4} wrap>
                {PRESENCE.map((person) => (
                  <Presence key={person.name} name={person.name} note={person.note} away={person.away} />
                ))}
              </Row>
            </Well>
          </>
        }
        second={
          <>
            {DEMO_GAMES.map((game) => (
              <Card key={game.key}>
                <Row gap={3}>
                  <span className="pk-glyph">
                    <Icon name={game.icon} size={22} />
                  </span>
                  <div className="pk-fill">
                    <h2 className="title">{game.name}</h2>
                    <p className="body-sm pk-muted">{game.blurb}</p>
                    <p className="caption pk-faint" style={{ marginTop: "var(--space-1)" }}>
                      {game.lobbies}
                    </p>
                  </div>
                  <ButtonLink
                    label="Play"
                    href={`/playground/${game.key}`}
                    tone={game.key === DEMO_GAMES[0].key ? "pool" : "quiet"}
                    size="sm"
                  />
                </Row>
              </Card>
            ))}

            <Banner
              tone="info"
              title="Nothing here can be bought"
              body="Speed, handling and scoring come from the game alone. No cosmetic, token or balance changes a single one."
            />

            <PreviewNote what="The lobbies, the players around and the games are fixtures." />
          </>
        }
      />
    </Screen>
  );
}
