import Link from "next/link";
import { Suspense } from "react";
import {
  Banner,
  ButtonLink,
  Chip,
  Icon,
  Mark,
  Paper,
  PetArt,
  PetFrame,
  Receipt,
  Row,
  Stack,
  ThemeMenu,
  WearableArt,
  type IconName,
} from "@/components/pk";
import { HeroPets } from "@/components/landing/hero-pets";
import { NetworkBadge } from "@/components/network-badge";
import { Obstacle, Star, Treat } from "@/components/play/game-art";
import { PERSONALITY_LABEL, SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet, utcDay } from "@/lib/guest/pet";
import { toCompanionRecord } from "@/lib/solana/accounts";
import { formatAgo, truncateAddress } from "@/lib/utils/format";
import { readAllPets } from "@/server/solana";
import { sponsorState } from "@/server/sponsor";

/** What the program holds is read at most once a minute. */
export const revalidate = 60;

const ON_SOLANA: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "paw", title: "One signature to move in", body: "Keep the pet you raised in this browser on Solana. Its name, species and temperament go with it." },
  { icon: "spark", title: "Pawket pays the fee", body: "A sponsor covers the network fee and the rent, and signs nothing but Pawket's own instructions. A wallet with no SOL can play." },
  { icon: "bolt", title: "No prompt for every care", body: "Link this device to a Pawket Wallet once, and care signs here inside the limits you set — each fee paid from a balance only you can fill or empty." },
  { icon: "doc", title: "A Passport anyone can open", body: "Every care, round and outfit is a signed record: the streak, the counts and the last eight cares, public at the pet's address." },
  { icon: "image", title: "A card in your wallet", body: "A keepsake that points at the pet, frozen for good: it cannot be sold or sent, because the pet is not for sale." },
];

const ASSET_COLUMNS = ["Thing", "What it is for", "Needed to play?", "Has a market price?"];

const ASSETS = [
  ["Your pets", "Identity, appearance, care, progress — as many as you adopt", "No — they start in this browser", "No"],
  ["Its record on Solana", "Every care, the streak and the level, kept where nobody can edit them", "No — keeping it there is your choice", "No"],
  ["Its keepsake card", "A frozen card in your wallet that points at the pet", "No", "No — it cannot be sold or sent"],
  ["Clothes", "Expression: eighteen looks, five of them earned by caring", "No", "No — the wardrobe is free"],
  ["A guild", "A crest and a place among other pets, kept on Solana", "No — joining is optional", "No — joining and leaving are free"],
  ["Guild token", "None exists. A guild is its pets, not a coin", "No", "Not in this version"],
  ["A Pawket Wallet", "A balance for the fees of a device you link, so care asks nothing each time", "No — it is optional", "No — it holds your SOL and gives it back"],
  ["SOL", "Network fees on devnet, which Pawket covers while it can", "No", "Yes, elsewhere"],
];

const NAV = [
  { label: "Home", href: "/home" },
  { label: "Park", href: "/park" },
  { label: "Playground", href: "/playground" },
  { label: "Profile", href: "/profile" },
  { label: "Guilds", href: "/guilds" },
];

/**
 * The front door: the pets first, then what a day with them is, then what
 * Solana adds — shown with a real Passport read from the program — then the
 * plain table of what is and is not owned. `display-hero` is used once,
 * here, and nowhere else in the product.
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
            <ThemeMenu />
          </span>
          <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />
        </div>
      </header>

      <main id="main">
        <section className="pk-band pk-landing__hero">
          <div className="pk-hero">
            <Stack gap={6}>
              <div>
                <Chip label="Live on Solana devnet" tone="pool" icon="check" />
              </div>
              <h1 className="display-hero" style={{ maxWidth: "12ch" }}>
                Raise a pet. Keep every paw print.
              </h1>
              <p className="body-lg pk-muted" style={{ maxWidth: "46ch" }}>
                Adopt a luna cat, a moss pup or a cloud bun. Feed them, dress them, play three little
                games together — they grow because you show up, not because you spent more. Keep them
                on Solana, and every care becomes a record nobody can erase.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
                <ButtonLink label="See the park" href="/park" tone="quiet" icon="users" size="lg" />
              </Row>
              <p className="body-sm pk-faint">
                Free to start. No wallet, no token, no Solana knowledge needed — your pet starts in this
                browser, and moves on chain only if you ask.
              </p>
            </Stack>
            <HeroPets />
          </div>
        </section>

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }} aria-label="Pawket right now">
          <Suspense fallback={<p className="receipt pk-faint">Reading the program…</p>}>
            <LiveStrip />
          </Suspense>
        </section>

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <div className="pk-landing__intro">
            <h2 className="display-m">A day with them</h2>
            <p className="body-lg pk-muted">Four things, a few minutes, and a face that remembers.</p>
          </div>
          <div className="pk-days">
            <article className="pk-day">
              <div className="pk-day__art pk-day__art--adopt">
                <span className="pk-day__frame">
                  <PetFrame form="cat" temper="curious" feeling="radiant" sky="warm" size="fluid" seed="Pepper" />
                  <span className="pk-day__tag">Pepper</span>
                </span>
              </div>
              <h3 className="display-s">Adopt</h3>
              <p className="body pk-muted">Choose one of three, give them a name and a temperament. Three taps, and the temperament is the face they wear.</p>
            </article>
            <article className="pk-day">
              <div className="pk-day__art pk-day__art--care">
                <span className="pk-day__face">
                  <PetFrame form="dog" temper="brave" feeling="hungry" sky="plain" size="fluid" still />
                </span>
                <Icon name="right" size={28} />
                <span className="pk-day__face">
                  <PetFrame form="dog" temper="brave" feeling="happy" sky="plain" size="fluid" seed="Biscuit" />
                </span>
              </div>
              <h3 className="display-s">Care</h3>
              <p className="body pk-muted">Feed, play, brush, rest. They show how they feel — a need is on their face until you meet it. There is no death, only a pet that misses you.</p>
            </article>
            <article className="pk-day">
              <div className="pk-day__art pk-day__art--play">
                <span className="pk-day__item" style={{ left: "16%", top: "14%" }}>
                  <Treat form="bun" />
                </span>
                <span className="pk-day__item" style={{ left: "72%", top: "10%" }}>
                  <Star />
                </span>
                <span className="pk-day__pot">
                  <Obstacle kind="pot" />
                </span>
                <span className="pk-day__pet">
                  <PetArt form="bun" temper="mischief" feeling="radiant" pose="full" seed="Tuesday" />
                </span>
              </div>
              <h3 className="display-s">Play</h3>
              <p className="body pk-muted">Catch the treats, hop the park path, copy the pattern on a giant paw. Any one is the day&apos;s round. The score stays yours.</p>
            </article>
            <article className="pk-day">
              <div className="pk-day__art pk-day__art--dress">
                <span className="pk-day__face pk-day__face--big">
                  <PetFrame form="bun" temper="cozy" feeling="happy" wearing="paper-crown" sky="cool" size="fluid" seed="Clover" />
                </span>
                <span className="pk-day__pieces">
                  {["wool-scarf", "red-collar", "nap-ribbon"].map((id) => (
                    <span key={id}>
                      <WearableArt id={id} />
                    </span>
                  ))}
                </span>
              </div>
              <h3 className="display-s">Dress</h3>
              <p className="body pk-muted">A scarf, a crown, a cape. Free, one at a time, tried on in the mirror first — and none of it changes a vital.</p>
            </article>
          </div>
        </section>

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <div className="pk-solana">
            <div className="pk-split pk-split--wide-left">
              <Stack gap={5}>
                <div>
                  <h2 className="display-m" style={{ color: "var(--ink-inverse)", maxWidth: "15ch" }}>
                    Keep them on Solana.
                  </h2>
                  <p className="body-lg pk-solana__muted" style={{ marginTop: "var(--space-3)", maxWidth: "46ch" }}>
                    When you want a record that outlives this browser, one signature moves your pet into
                    the Pawket program. From then on, care is something anyone can check.
                  </p>
                </div>
                <ul className="pk-solana__list">
                  {ON_SOLANA.map((item) => (
                    <li key={item.title}>
                      <span className="pk-solana__icon">
                        <Icon name={item.icon} size={20} />
                      </span>
                      <span>
                        <span className="title" style={{ color: "var(--ink-inverse)" }}>
                          {item.title}
                        </span>
                        <span className="body-sm pk-solana__muted">{item.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Row gap={3} wrap>
                  <ButtonLink label="See every pet" href="/park" tone="pool" icon="users" />
                </Row>
              </Stack>
              <Suspense fallback={<p className="receipt pk-solana__muted">Reading a Passport…</p>}>
                <FeaturedPassport />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <div className="pk-split pk-split--table">
            <Stack gap={4}>
              <h2 className="display-m" style={{ maxWidth: "15ch" }}>
                What you actually own
              </h2>
              <p className="body pk-muted" style={{ maxWidth: "40ch" }}>
                Most games put this on a page nobody reads. Ours is on the front page, in the same table
                we use internally.
              </p>
              <Banner
                tone="guild"
                title="Guilds, optional, always"
                body="A pet can join a guild on Solana — a crest, a motto, other pets — and leave whenever its owner likes. Joining adds people to the game. It adds nothing to a pet — no stat, no speed, no XP — and there is no token."
                action={<ButtonLink label="See the guilds" href="/guilds" tone="ghost" size="sm" after="right" />}
              />
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

        <section className="pk-band" style={{ paddingBottom: "var(--space-9)" }}>
          <div className="pk-finale">
            <div className="pk-finale__pets" aria-hidden="true">
              <PetArt form="cat" temper="mischief" feeling="happy" wearing="star-pin" pose="full" seed="Miso" />
              <PetArt form="bun" temper="curious" feeling="radiant" pose="full" seed="Mochi" />
              <PetArt form="dog" temper="cozy" feeling="happy" wearing="red-collar" pose="full" seed="Noodle" />
            </div>
            <h2 className="display-l">Who is coming home with you?</h2>
            <p className="body-lg pk-muted">Three taps. No wallet. They will be waiting tomorrow.</p>
            <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
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
            <ThemeMenu />
          </span>
          <NetworkBadge />
        </Stack>
        <p className="body-sm pk-faint">
          Pawket is a game you play in this browser. The pet you adopt is saved here, and clearing
          this browser&apos;s data removes them — unless you keep them on Solana, where the program
          holds the record. Guild tokens are not for sale.
        </p>
      </footer>
    </>
  );
}

/** What has happened, counted from the program's accounts: no database, no estimate. */
async function LiveStrip() {
  let figures: Array<{ k: string; v: string }> | null = null;
  try {
    const [pets, sponsor] = await Promise.all([readAllPets(), sponsorState().catch(() => null)]);
    const today = utcDay(new Date());
    figures = [
      { k: "Pets kept on Solana", v: String(pets.length) },
      { k: "Out today", v: String(pets.filter((entry) => toCompanionRecord(entry).streak.lastDay === today).length) },
      { k: "Cares recorded", v: String(pets.reduce((sum, entry) => sum + entry.passport.careCount, 0)) },
      { k: "Network fee", v: sponsor?.available ? "Paid by Pawket" : "A little devnet SOL" },
    ];
  } catch {
    figures = null;
  }
  if (!figures) {
    return <p className="body-sm pk-muted">Solana did not answer just now. The record is unchanged.</p>;
  }
  return (
    <Paper title="On Solana devnet, right now" meta="Read from the program">
      <dl className="pk-live">
        {figures.map((figure) => (
          <div key={figure.k} className="pk-live__fig">
            <dt className="receipt-label">{figure.k}</dt>
            <dd className="amount">{figure.v}</dd>
          </div>
        ))}
      </dl>
    </Paper>
  );
}

/** The most cared-for pet the program keeps, as anyone can see it. */
async function FeaturedPassport() {
  let best: Awaited<ReturnType<typeof readAllPets>>[number] | undefined;
  try {
    best = (await readAllPets()).sort((a, b) => b.passport.careCount - a.passport.careCount || b.pet.xp - a.pet.xp)[0];
  } catch {
    best = undefined;
  }
  if (!best) {
    return <p className="body-sm pk-solana__muted">Solana did not answer just now. Every Passport is unchanged.</p>;
  }
  const now = new Date();
  const record = toCompanionRecord(best);
  const projected = projectGuestPet(record, now);
  const last = best.passport.recent.at(-1);
  return (
    <div className="pk-passcard">
      <div className="pk-passcard__head">
        <span className="pk-passcard__pet">
          <PetFrame {...petLook(record, projected.mood)} sky={SPECIES_SKY[best.pet.species]} size="fluid" level={projected.level} />
        </span>
        <div>
          <p className="label pk-faint">A real Passport</p>
          <p className="display-s" style={{ overflowWrap: "anywhere" }}>
            {best.pet.name}
          </p>
          <p className="body-sm pk-muted">
            {SPECIES_LABEL[best.pet.species]} · {PERSONALITY_LABEL[best.pet.personality]}
          </p>
        </div>
      </div>
      <Paper title="Read from chain" meta={truncateAddress(best.pet.address)}>
        <Receipt
          rows={[
            { k: "Level", v: String(projected.level) },
            { k: "Cares", v: String(best.passport.careCount) },
            { k: "Best run", v: `${best.passport.bestStreak} ${best.passport.bestStreak === 1 ? "day" : "days"}` },
            { k: "Rounds played", v: String(best.passport.plays) },
            { k: "Last care", v: last ? `${formatAgo(now.getTime() / 1000 - last.at)}` : "None yet" },
          ]}
        />
      </Paper>
      <ButtonLink label="Open their Passport" href={`/pet/${best.pet.address}`} tone="quiet" after="right" full />
    </div>
  );
}
