import Link from "next/link";
import {
  Banner,
  ButtonLink,
  Card,
  Chip,
  GuildRow,
  Icon,
  Mark,
  Paper,
  PetFrame,
  Presence,
  Row,
  Stack,
} from "@/components/pk";
import { NetworkBadge } from "@/components/network-badge";
import { ThemeToggle } from "@/components/pk";
import { DEMO_GUILDS } from "@/lib/demo";

const LOOP = [
  "Adopt a pet",
  "Make it yours",
  "Care and play",
  "Grow together",
  "Meet others",
  "Collect and trade",
];

const PILLARS = [
  {
    icon: "paw",
    title: "Collect",
    body: "Every pet is one of a kind: its own species, coat, traits and history. Cloth, Copper, Glass or Foil — written out, never a glow.",
  },
  {
    icon: "spark",
    title: "Customise",
    body: "Scarves, crowns, window seats, porch lanterns. Anything you own can be worn by any pet you own.",
  },
  {
    icon: "heart",
    title: "Care",
    body: "Feed, brush, play. Care fills in counts you can see — three of three — so progress is something you can point at.",
  },
  {
    icon: "ball",
    title: "Play together",
    body: "Short games your pet plays as you. Bring a friend, or drop into a lobby and meet one.",
  },
] as const;

const ASSETS = [
  ["Your pet", "Identity, appearance, traits, progress", "No — guests play too", "No"],
  ["Cosmetics", "Expression: what your pet wears and where it lives", "No", "Tradeable, not financialised"],
  ["Guild token", "Optional community flair, votes and events", "No", "Yes — and it can go to zero"],
  ["SOL", "Paying for things, when you choose to", "No", "Yes"],
];

const NAV = [
  { label: "Home", href: "/home" },
  { label: "Market", href: "/market" },
  { label: "Playground", href: "/playground" },
  { label: "Guilds", href: "/guilds" },
];

/**
 * The front door: the pet first, the ledger last. `display-hero` is used
 * once, here, and nowhere else in the product.
 */
export default function LandingPage() {
  return (
    <main>
      <div className="pk-band" style={{ paddingTop: "var(--space-6)", paddingBottom: "var(--space-6)" }}>
        <div className="pk-spread" style={{ flexWrap: "wrap" }}>
          <Mark href="/" size={30} type={21} />
          <Row gap={6} wrap className="pk-fill" style={{ justifyContent: "center" }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="label pk-muted"
                style={{ textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ))}
          </Row>
          <Row gap={3} wrap>
            <ThemeToggle />
            <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
          </Row>
        </div>
      </div>

      {/* hero */}
      <div className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
        <div className="pk-hero">
          <Stack gap={6}>
            <h1 className="display-hero" style={{ maxWidth: "11ch" }}>
              A pet in your pocket.
            </h1>
            <p className="body-lg pk-muted" style={{ maxWidth: "46ch" }}>
              Adopt a luna cat, a moss pup or a cloud bun. Feed it, dress it, and take it out to
              play with other people’s pets. It grows because you show up — not because you spent
              more.
            </p>
            <Row gap={3} wrap>
              <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
              <ButtonLink label="Look around first" href="/home" tone="quiet" size="lg" />
            </Row>
            <p className="body-sm pk-faint">
              Free to start. No wallet, no token, no Solana knowledge needed — and none of it is
              needed later either.
            </p>
          </Stack>

          <div className="pk-stage">
            <PetFrame form="cat" level={7} rarity="foil" mood="Playful" sky="warm" />
            <PetFrame form="bird" level={12} rarity="glass" mood="Singing" sky="cool" />
            <PetFrame form="bun" level={5} rarity="copper" mood="Sleepy" sky="plain" />
            <Row gap={2} wrap style={{ justifyContent: "center", width: "100%" }}>
              <Chip label="Fed 3 / 3" tone="sprout" icon="bowl" />
              <Chip label="Wool scarf" tone="sun" icon="spark" />
            </Row>
          </div>
        </div>
      </div>

      {/* the loop, as six pills */}
      <div className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
        <p className="label pk-faint" style={{ marginBottom: "var(--space-5)" }}>
          How it goes
        </p>
        <div className="pk-chain">
          {LOOP.map((step, index) => (
            <span key={step} style={{ display: "contents" }}>
              {index ? <i className="pk-chain__link" aria-hidden="true" /> : null}
              <span className="pk-pill">{step}</span>
            </span>
          ))}
        </div>
      </div>

      {/* four pillars */}
      <div className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
        <div className="pk-pillars">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title}>
              <span className="pk-glyph">
                <Icon name={pillar.icon} size={22} />
              </span>
              <div className="display-s" style={{ margin: "var(--space-4) 0 var(--space-2)" }}>
                {pillar.title}
              </div>
              <p className="body pk-muted">{pillar.body}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* the playground, on an ink band */}
      <div className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
        <Card variant="ink" style={{ padding: "var(--space-7)" }}>
          <div className="pk-split">
            <div>
              <h2 className="display-m" style={{ color: "var(--ink-inverse)", maxWidth: "14ch" }}>
                Your pet is how people know you.
              </h2>
              <p className="body-lg pk-muted" style={{ marginTop: "var(--space-4)", maxWidth: "48ch" }}>
                In the Playground your pet is your face. Same coat, same scarf, same name — in a
                race, in a lobby, in someone else’s room.
              </p>
              <Row gap={5} wrap style={{ marginTop: "var(--space-6)" }}>
                <ButtonLink label="See the games" href="/playground" tone="pool" icon="ball" />
                <Presence name="Wren" />
                <Presence name="Tobi" />
                <Presence name="Juno" away note="away" />
              </Row>
            </div>
            <Row gap={4} wrap style={{ justifyContent: "center" }}>
              <PetFrame form="dog" level={3} rarity="cloth" sky="cool" />
              <PetFrame form="cat" level={7} rarity="foil" sky="warm" />
            </Row>
          </div>
        </Card>
      </div>

      {/* guilds: the band's size is the point */}
      <div className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
        <div className="pk-guildband">
          <div className="pk-split pk-split--wide-right">
            <Stack gap={5}>
              <div>
                <Chip label="Optional" tone="bloom" icon="guild" />
              </div>
              <h2 className="display-m" style={{ maxWidth: "13ch" }}>
                Guilds, if you want them.
              </h2>
              <p className="body-lg pk-muted" style={{ maxWidth: "44ch" }}>
                Some communities run events, vote on the next cosmetic, and keep a shared treasury
                out in the open. Joining one adds people to your game. It adds nothing to your pet.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="Browse guilds" href="/guilds" tone="bloom" icon="guild" />
                <ButtonLink label="How guilds work" href="/guilds/boundary" tone="quiet" />
              </Row>
            </Stack>

            <Stack gap={3}>
              {DEMO_GUILDS.slice(0, 2).map((guild) => (
                <GuildRow
                  key={guild.slug}
                  name={guild.name}
                  href={`/guilds/${guild.slug}`}
                  letter={guild.letter}
                  color={guild.color}
                  members={guild.members}
                  stage={guild.stageLabel}
                  blurb={guild.blurb}
                  official={guild.official}
                />
              ))}
              <Banner
                tone="info"
                title="A guild token never touches your pet"
                body="No stat increase, no faster care, no XP multiplier, no matchmaking priority, no queue skip. Ever."
              />
            </Stack>
          </div>
        </div>
      </div>

      {/* what you actually own — Paper, and on the front page */}
      <div className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
        <div className="pk-split pk-split--wide-left">
          <Stack gap={4}>
            <h2 className="display-m" style={{ maxWidth: "15ch" }}>
              What you actually own
            </h2>
            <p className="body pk-muted" style={{ maxWidth: "40ch" }}>
              Most games put this on a page nobody reads. Ours is on the front page, in the same
              table we use internally.
            </p>
          </Stack>

          <Paper title="Asset model" meta="Plain language">
            <table className="pk-assets">
              <thead>
                <tr>
                  <th>Thing</th>
                  <th>What it is for</th>
                  <th>Needed to play?</th>
                  <th>Has a market price?</th>
                </tr>
              </thead>
              <tbody>
                {ASSETS.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        </div>
      </div>

      <footer
        className="pk-band"
        style={{
          paddingTop: "var(--space-8)",
          paddingBottom: "var(--space-9)",
          borderTop: "var(--stroke-line) solid var(--edge-soft)",
        }}
      >
        <div className="pk-spread" style={{ flexWrap: "wrap", gap: "var(--space-5)" }}>
          <Stack gap={3}>
            <Mark href="/" size={26} type={18} />
            <NetworkBadge />
          </Stack>
          <span className="body-sm pk-faint" style={{ maxWidth: "62ch" }}>
            Pawket is a game. Guild tokens are optional community infrastructure, not investments,
            and carry no promise of value. Supply, allocations, fees and treasury activity are
            published before any launch opens. The product surfaces are a design preview and render
            demo data.
          </span>
        </div>
      </footer>
    </main>
  );
}
