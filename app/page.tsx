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
  ThemeToggle,
} from "@/components/pk";
import { NetworkBadge } from "@/components/network-badge";
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

const ASSET_COLUMNS = ["Thing", "What it is for", "Needed to play?", "Has a market price?"];

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
    <>
      <a href="#main" className="pk-btn pk-btn--quiet pk-btn--sm pk-skip">
        Skip to content
      </a>
      <header className="pk-band pk-landing__head">
        <Mark href="/" size={30} type={21} />
        <nav className="pk-landing__nav label" aria-label="Pawket">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="pk-landing__link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="pk-landing__aside">
          <span className="pk-landing__theme--head">
            <ThemeToggle />
          </span>
          <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
        </div>
      </header>

      <main id="main">
        {/* hero */}
        <section className="pk-band" style={{ paddingTop: "var(--space-6)", paddingBottom: "var(--space-9)" }}>
          <div className="pk-hero">
            <Stack gap={6}>
              <h1 className="display-hero" style={{ maxWidth: "11ch" }}>
                A pet in your pocket.
              </h1>
              <p className="body-lg pk-muted" style={{ maxWidth: "46ch" }}>
                Adopt a luna cat, a moss pup or a cloud bun. Feed it, dress it, and take it out to
                play with other people’s pets. It grows because you show up — not because you
                spent more.
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
              <PetFrame form="cat" level={7} rarity="foil" mood="Playful" sky="warm" size="fluid" />
              <PetFrame form="bird" level={12} rarity="glass" mood="Singing" sky="cool" size="fluid" />
              <PetFrame form="bun" level={5} rarity="copper" mood="Sleepy" sky="plain" size="fluid" />
              <div className="pk-stage__chips">
                <Chip label="Fed 3 / 3" tone="sprout" icon="bowl" />
                <Chip label="Wool scarf" tone="sun" icon="spark" />
              </div>
            </div>
          </div>
        </section>

        {/* the loop, as six pills */}
        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <h2 className="label pk-faint" style={{ marginBottom: "var(--space-5)" }}>
            How it goes
          </h2>
          <ol className="pk-chain">
            {LOOP.map((step) => (
              <li key={step} className="pk-chain__step">
                <span className="pk-pill">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* four pillars */}
        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <h2 className="pk-sr">What you do in Pawket</h2>
          <div className="pk-pillars">
            {PILLARS.map((pillar) => (
              <Card key={pillar.title}>
                <span className="pk-glyph">
                  <Icon name={pillar.icon} size={22} />
                </span>
                <h3 className="display-s" style={{ margin: "var(--space-4) 0 var(--space-2)" }}>
                  {pillar.title}
                </h3>
                <p className="body pk-muted">{pillar.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* the playground, on an ink band */}
        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <Card variant="ink" className="pk-inkband">
            <div className="pk-split">
              <div>
                <h2 className="display-m" style={{ color: "var(--ink-inverse)", maxWidth: "14ch" }}>
                  Your pet is how people know you.
                </h2>
                <p className="body-lg pk-muted" style={{ marginTop: "var(--space-4)", maxWidth: "48ch" }}>
                  In the Playground your pet is your face. Same coat, same scarf, same name — in a
                  race, in a lobby, in someone else’s room.
                </p>
                <div style={{ marginTop: "var(--space-6)" }}>
                  <ButtonLink label="See the games" href="/playground" tone="pool" icon="ball" />
                </div>
                <Row gap={5} wrap style={{ marginTop: "var(--space-5)" }}>
                  <Presence name="Wren" />
                  <Presence name="Tobi" />
                  <Presence name="Juno" away note="away" />
                </Row>
              </div>
              <div className="pk-duo">
                <PetFrame form="dog" level={3} rarity="cloth" sky="cool" size="fluid" />
                <PetFrame form="cat" level={7} rarity="foil" sky="warm" size="fluid" />
              </div>
            </div>
          </Card>
        </section>

        {/* guilds: the band's size is the point */}
        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
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
                  Some communities run events, vote on the next cosmetic, and keep a shared
                  treasury out in the open. Joining one adds people to your game. It adds nothing
                  to your pet.
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
        </section>

        {/* what you actually own — Paper, and on the front page */}
        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
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
              {/* Roles are explicit because a phone lays these rows out as
                  blocks, and a table must stay a table to a screen reader. */}
              <table className="pk-assets" role="table">
                <thead role="rowgroup">
                  <tr role="row">
                    {ASSET_COLUMNS.map((column) => (
                      <th key={column} role="columnheader" scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {ASSETS.map((row) => (
                    <tr key={row[0]} role="row">
                      {row.map((cell, index) => (
                        <td key={ASSET_COLUMNS[index]} role="cell" data-label={ASSET_COLUMNS[index]}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Paper>
          </div>
        </section>
      </main>

      <footer className="pk-band pk-landing__foot">
        <Stack gap={4}>
          <Mark href="/" size={26} type={18} />
          <nav className="pk-landing__footnav label" aria-label="Footer">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="pk-landing__link">
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="pk-landing__theme--foot">
            <ThemeToggle />
          </span>
          <NetworkBadge />
        </Stack>
        <p className="body-sm pk-faint">
          Pawket is a game. Guild tokens are optional community infrastructure, not investments,
          and carry no promise of value. Supply, allocations, fees and treasury activity are
          published before any launch opens. The product surfaces are a design preview and render
          demo data.
        </p>
      </footer>
    </>
  );
}
