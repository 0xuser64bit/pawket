import Link from "next/link";
import { Suspense } from "react";
import {
  Banner,
  ButtonLink,
  Card,
  Chip,
  Icon,
  Mark,
  Paper,
  PetFrame,
  Receipt,
  Row,
  Stack,
  ThemeToggle,
} from "@/components/pk";
import { NetworkBadge } from "@/components/network-badge";
import { readAllPets } from "@/server/solana";
import { sponsorState } from "@/server/sponsor";

/** The count of pets on Solana is read at most once a minute. */
export const revalidate = 60;

const LOOP = ["Adopt a pet", "Name them", "Care for them", "Play a round", "Keep the record", "Watch them grow"];

const PILLARS = [
  {
    icon: "paw",
    title: "Adopt",
    body: "A luna cat, a moss pup or a cloud bun, and a temperament you choose. Every pet is Cloth. Rarity is not a checkout.",
  },
  {
    icon: "spark",
    title: "Dress",
    body: "A wool scarf, a paper crown, a rain cape. One look at a time, and none of it changes a vital.",
  },
  {
    icon: "heart",
    title: "Care",
    body: "Feed, brush, play, rest. Each one waits half an hour. The vitals you see are an estimate of time away, and there is no death.",
  },
  {
    icon: "ball",
    title: "Play",
    body: "Catch, Hop or Copy, with your pet in the game. Finish a round and the day counts. The score never changes a vital.",
  },
] as const;

const ASSET_COLUMNS = ["Thing", "What it is for", "Needed to play?", "Has a market price?"];

const ASSETS = [
  ["Your pet", "Identity, appearance, care, progress", "No — it starts in this browser", "No"],
  ["Its record on Solana", "Every care, the streak and the level, kept where nobody can edit them", "No — keeping it there is your choice", "No"],
  ["Clothes", "Expression: the one look they are wearing", "No", "No — the wardrobe is free"],
  ["Guild token", "A future community, if guilds ever open", "No", "Not in this version"],
  ["SOL", "Network fees on devnet, which Pawket covers while it can", "No", "Yes, elsewhere"],
];

const NAV = [
  { label: "Home", href: "/home" },
  { label: "Park", href: "/park" },
  { label: "Playground", href: "/playground" },
  { label: "Inventory", href: "/inventory" },
  { label: "Guilds", href: "/guilds" },
];

/**
 * The front door: the pet first, the rules last. `display-hero` is used
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
        <section className="pk-band" style={{ paddingTop: "var(--space-6)", paddingBottom: "var(--space-9)" }}>
          <div className="pk-hero">
            <Stack gap={6}>
              <h1 className="display-hero" style={{ maxWidth: "11ch" }}>
                A pet in your pocket.
              </h1>
              <p className="body-lg pk-muted" style={{ maxWidth: "46ch" }}>
                Adopt a luna cat, a moss pup or a cloud bun. Feed it, dress it, and run a short
                game together. It grows because you show up — not because you spent more.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
                <ButtonLink label="Look around first" href="/home" tone="quiet" size="lg" />
              </Row>
              <p className="body-sm pk-faint">
                Free to start. No wallet, no token, no Solana knowledge needed. When you want a
                record nobody can erase, you can keep your pet on Solana.
              </p>
            </Stack>

            <div className="pk-stage">
              <PetFrame form="cat" level={1} rarity="cloth" mood="Happy" sky="warm" size="fluid" />
              <PetFrame form="dog" level={2} rarity="cloth" mood="Okay" sky="plain" size="fluid" />
              <PetFrame form="bun" level={3} rarity="cloth" mood="Radiant" sky="cool" size="fluid" />
              <div className="pk-stage__chips">
                <Chip label="Level 1" tone="sprout" icon="spark" />
                <Chip label="Wool scarf" tone="sun" icon="heart" />
              </div>
            </div>
          </div>
        </section>

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

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <Card variant="ink" className="pk-inkband">
            <div className="pk-split">
              <div>
                <h2 className="display-m" style={{ color: "var(--ink-inverse)", maxWidth: "14ch" }}>
                  Your pet plays too.
                </h2>
                <p className="body-lg pk-muted" style={{ marginTop: "var(--space-4)", maxWidth: "48ch" }}>
                  Three games in the playground: catch the treats, hop the park path, copy the
                  pattern on a giant paw. Finish one and the day counts. The score stays yours.
                </p>
                <div style={{ marginTop: "var(--space-6)" }}>
                  <ButtonLink label="See the game" href="/playground" tone="pool" icon="ball" />
                </div>
              </div>
              <div className="pk-duo">
                <PetFrame form="dog" level={2} rarity="cloth" sky="cool" size="fluid" />
                <PetFrame form="cat" level={3} rarity="cloth" sky="warm" size="fluid" />
              </div>
            </div>
          </Card>
        </section>

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <div className="pk-split pk-split--wide-right">
            <Stack gap={4}>
              <h2 className="display-m" style={{ maxWidth: "14ch" }}>
                A record nobody can erase.
              </h2>
              <p className="body-lg pk-muted" style={{ maxWidth: "44ch" }}>
                Keep your pet on Solana and every care becomes a signed record: the level, the
                streak, the last cares, in an account only your wallet can write to. It outlives this
                browser, and anyone can look it up.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="See the park" href="/park" tone="pool" icon="users" />
              </Row>
            </Stack>
            <Paper title="On Solana devnet" meta="Read live">
              <Suspense fallback={<p className="receipt pk-faint">Reading the program…</p>}>
                <PetsOnChain />
              </Suspense>
            </Paper>
          </div>
        </section>

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <div className="pk-guildband">
            <div className="pk-split pk-split--wide-right">
              <Stack gap={5}>
                <div>
                  <Chip label="Not open" icon="guild" />
                </div>
                <h2 className="display-m" style={{ maxWidth: "13ch" }}>
                  Guilds, later, if at all.
                </h2>
                <p className="body-lg pk-muted" style={{ maxWidth: "44ch" }}>
                  There is no guild to join. The rule is already written: joining one would add
                  people to the game. It would add nothing to a pet.
                </p>
                <Row gap={3} wrap>
                  <ButtonLink label="Read the boundary" href="/guilds" tone="bloom" icon="guild" />
                </Row>
              </Stack>

              <Stack gap={3}>
                <Banner
                  tone="info"
                  title="A guild token never touches your pet"
                  body="No stat increase, no faster care, no XP multiplier, no matchmaking priority, no queue skip. Ever."
                />
                <Banner
                  tone="risk"
                  title="Nothing on this page is for sale"
                  body="No listing, no treasury, no swap. A price is not part of caring for a pet."
                />
              </Stack>
            </div>
          </div>
        </section>

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
          Pawket is a game you play in this browser. The pet you adopt is saved here, and clearing
          this browser&apos;s data removes them — unless you keep them on Solana, where the program
          below holds the record. Guild tokens are not for sale.
        </p>
      </footer>
    </>
  );
}

/** A count that has happened: the pets the program keeps right now. */
async function PetsOnChain() {
  let count: number | null = null;
  let cares = 0;
  let covered = false;
  try {
    const [pets, sponsor] = await Promise.all([readAllPets(), sponsorState().catch(() => null)]);
    count = pets.length;
    cares = pets.reduce((sum, entry) => sum + entry.passport.careCount, 0);
    covered = sponsor?.available ?? false;
  } catch {
    count = null;
  }
  if (count === null) {
    return <p className="body-sm pk-muted">Solana did not answer just now. The record is unchanged.</p>;
  }
  return (
    <Receipt
      rows={[
        { k: "Pets kept", v: String(count) },
        { k: "Cares recorded", v: String(cares) },
        { k: "Network fee", v: covered ? "Paid by Pawket" : "A little devnet SOL" },
      ]}
      note="Counted from the program's accounts, not from a database."
    />
  );
}
