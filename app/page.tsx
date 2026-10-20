import { NavLink as Link } from "@/components/pk/nav-link";
import Image from "next/image";
import { Suspense } from "react";
import {
  ButtonLink,
  Chip,
  Icon,
  ItemTile,
  Mark,
  Paper,
  PetArt,
  PetFrame,
  Receipt,
  Row,
  Stack,
  ThemeButton,
  WearableArt,
  type IconName,
} from "@/components/pk";
import { HeroPets } from "@/components/landing/hero-pets";
import { DecorArt } from "@/components/home/decor-art";
import { FrameArt } from "@/components/market/frame-art";
import { wearableItem } from "@/lib/closet/catalog";
import { roomItem } from "@/config/themes";
import { PHOTO_FRAMES } from "@/lib/market/frames";
import { marketPrice } from "@/lib/solana/instructions";
import { COATS } from "@/lib/player/coats";
import { PetSpecies } from "@/lib/game/enums";
import { formatUnits } from "@/lib/utils/format";
import { NetworkBadge } from "@/components/network-badge";
import { getPublicEnv } from "@/config/env";
import { SUPPORT_EMAIL } from "@/config/site";
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
  { icon: "paw", title: "One signature to move in", body: "The pet you raised here keeps its name, species and temperament." },
  { icon: "spark", title: "Fees covered while we can", body: "While Pawket's sponsor is up, it pays fees and rent, so a Pawket Wallet can start empty." },
  { icon: "bolt", title: "One approval, then no pop-ups", body: "Link once, and this browser signs care, rounds and outfits inside the limits you set." },
  { icon: "doc", title: "A Passport anyone can open", body: "The streak, the counts and the last eight cares, public at the pet's address." },
  { icon: "image", title: "A keepsake card", body: "A frozen card in your wallet that points at the pet. It cannot be sold or sent." },
];

/** What a player can own, in three plain columns; the full table is folded underneath. */
const OWNED: Array<{ title: string; note: string; things: string[]; paper?: boolean }> = [
  { title: "Free, no wallet", note: "Yours from the first tap, kept in this browser.", things: ["Your pets, as many as you adopt", "Their room and its things", "Five coats each, and clothes to start", "Every game and every round"] },
  { title: "On Solana, if you choose", note: "Records nobody can edit, and nothing to sell.", things: ["Their Passport: every care, the streak", "A keepsake card that cannot be sold", "A guild, joined and left for free"] },
  { title: "Costs SOL, if you choose", note: "Fixed prices, stated before you approve.", things: ["Market looks: pieces, rooms, frames", "A guild's coin: optional, and it can fall to nothing"], paper: true },
];

/** The Market, as a shelf of real things at their fixed prices. */
const SHELF = [
  { name: "Halo", kind: "Foil piece", rarity: "foil", item: wearableItem("halo"), art: <WearableArt id="halo" className="pk-tile__piece" /> },
  { name: "Wizard hat", kind: "Foil piece", rarity: "foil", item: wearableItem("wizard-hat"), art: <WearableArt id="wizard-hat" className="pk-tile__piece" /> },
  { name: "Blossom", kind: "Glass room", rarity: "glass", item: roomItem("blossom")!, art: <span className="pk-market-room" data-theme-preview="blossom" aria-hidden="true" /> },
  { name: "Starry night", kind: "Copper frame", rarity: "copper", item: PHOTO_FRAMES.find((frame) => frame.id === "starry")!.item, art: <FrameArt id="starry" className="pk-market-frame" /> },
  { name: "Star pin", kind: "Cloth piece", rarity: "cloth", item: wearableItem("star-pin"), art: <WearableArt id="star-pin" className="pk-tile__piece" /> },
] as const;

/** Things for the room, as the Market and Home draw them. */
const ROOM_THINGS = ["sea-painting", "sunflower", "cloud-bed", "wall-clock", "round-rug", "bookcase"];

const ASSET_COLUMNS = ["Thing", "What it is for", "Needed to play?", "Has a market price?"];

const ASSETS = [
  ["Your pets", "Identity, appearance, care, progress — as many as you adopt", "No — they start in this browser", "No"],
  ["Its record on Solana", "Every care, the streak and the level, kept where nobody can edit them", "No — keeping it there is your choice", "No"],
  ["Its keepsake card", "A frozen card in your wallet that points at the pet", "No", "No — it cannot be sold or sent"],
  ["Clothes, coats and rooms", "Expression: three pieces, five coats, two rooms and most of the room's things free; twenty-five pieces, twelve rooms and eight photo frames in the Market", "No", "Free, or a fixed price in the Market — never resold, never power"],
  ["A guild", "A crest and a place among other pets, kept on Solana", "No — joining is optional", "No — joining and leaving are free"],
  ["A guild's coin", "Optional: a guild may launch one on Meteora. Holders' pets wear its crest pin", "No — and it never touches a pet", "Yes: it trades, and can fall to nothing"],
  ["A Pawket Wallet", "One balance and one history for everything on Solana: a browser you link signs your pets' actions with no pop-up, and Market looks and coins spend it when your wallet approves", "Only on Solana — a browser pet needs none", "No — it holds your SOL and gives it back"],
  ["SOL", "A little in your Pawket Wallet to play on Solana; Pawket covers network fees and rent while it can", "Only on Solana — devnet SOL is free", "Yes, elsewhere"],
];

const NAV = [
  { label: "Home", href: "/home" },
  { label: "Park", href: "/park" },
  { label: "Playground", href: "/playground" },
  { label: "Market", href: "/market" },
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
            <ThemeButton />
          </span>
          <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" className="pk-landing__adopt" />
        </div>
      </header>

      <main id="main">
        <section className="pk-band pk-landing__hero">
          <div className="pk-hero">
            <Stack gap={6}>
              <h1 className="display-hero pk-hero__title" style={{ maxWidth: "12ch" }}>
                Raise a pet. Keep every paw print.
              </h1>
              <p className="body-lg pk-muted pk-hero__lede" style={{ maxWidth: "40ch" }}>
                A little cat, pup or bun who grows because you show up. Care for them, make their room
                theirs, play a round together — and keep their story on Solana if you like.
              </p>
              <div className="pk-hero__go">
                <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
                <ButtonLink label="See the park" href="/park" tone="quiet" icon="users" size="lg" />
              </div>
              <div className="pk-hero__note">
                <p className="body-sm pk-faint">Free to start. No wallet, no token: they live in this browser until you choose otherwise.</p>
                <Chip label={`Live on Solana ${getPublicEnv().solanaCluster}`} tone="pool" icon="check" />
              </div>
            </Stack>
            <HeroPets />
          </div>
        </section>

        <section className="pk-band pk-landing__band" aria-label="Pawket right now">
          <Suspense fallback={<p className="receipt pk-faint">Reading the program…</p>}>
            <LiveStrip />
          </Suspense>
        </section>

        <section className="pk-band pk-landing__band">
          <div className="pk-roomshow">
            <div className="pk-roomshow__head">
              <div>
                <h2 className="display-m" style={{ maxWidth: "14ch" }}>
                  A room that is theirs
                </h2>
                <p className="body-lg pk-muted" style={{ marginTop: "var(--space-3)", maxWidth: "40ch" }}>
                  Hang a picture, set out a plant, roll out a rug, choose their bed. Then strike a pose and
                  take a photo of the two of you.
                </p>
              </div>
              <Stack gap={4}>
                <ul className="pk-roomshow__things" aria-label="A few of the room's things">
                  {ROOM_THINGS.map((id) => (
                    <li key={id}>
                      <DecorArt id={id} />
                    </li>
                  ))}
                </ul>
                <p className="body-sm pk-muted">
                  Thirty-one things, most of them free; each room in the Market brings one of its own. Looks
                  only: none of it changes a vital or a score.
                </p>
                <Row gap={3} wrap>
                  <ButtonLink label="See the room's things" href="/market#decor" tone="quiet" icon="sofa" />
                </Row>
              </Stack>
            </div>
            <div className="pk-roomshow__photos" aria-label="Photos taken in Pawket's rooms" role="group">
              {[
                { src: "/landing/pepper.webp", alt: "A photo from Pawket: the player waves beside Pepper, a ginger cat, in a room with a sea painting, a sunflower and a cloud bed." },
                { src: "/landing/biscuit.webp", alt: "Biscuit, a golden pup, dancing with the player under bunting, by a monstera and a cardboard box bed." },
                { src: "/landing/mochi.webp", alt: "The player kneels to pat Mochi, a mint-coated bun, on a heart rug beside a donut bed and a wall clock." },
              ].map((photo) => (
                <figure key={photo.src} className="pk-roomshow__print">
                  <Image src={photo.src} alt={photo.alt} width={1080} height={966} sizes="(max-width: 1023px) 78vw, 400px" />
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="pk-band pk-landing__band">
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
                <span className="pk-day__coats" aria-hidden="true">
                  {COATS[PetSpecies.LunaCat].map((coat) => (
                    <span key={coat.id} style={{ background: `linear-gradient(135deg, ${coat.coat} 0 62%, ${coat.patch} 62%)` }} />
                  ))}
                </span>
              </div>
              <h3 className="display-s">Adopt</h3>
              <p className="body pk-muted">A cat, a pup or a bun, in one of five coats. Give them a name and a temperament: three taps.</p>
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
              <p className="body pk-muted">Feed, play, brush, rest. A need shows on their face until you meet it. No pet ever dies; it only misses you.</p>
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
              <p className="body pk-muted">Catch, Hop, Copy and Pairs. One round a day, the same for everyone; the score stays yours.</p>
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
              <p className="body pk-muted">A scarf, a crown, a collar to start. Tried on in the mirror first, and never a stat.</p>
            </article>
          </div>
        </section>

        <section className="pk-band pk-landing__band">
          <div className="pk-shelfshow">
            <Stack gap={4}>
              <h2 className="display-m" style={{ maxWidth: "12ch" }}>
                Looks, never power
              </h2>
              <p className="body-lg pk-muted" style={{ maxWidth: "38ch" }}>
                Twenty-five pieces, twelve rooms and eight photo frames, at prices the program fixes for
                everyone. Nothing bought changes a vital, XP or a score, and nothing is resold.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="Browse the Market" href="/market" tone="quiet" icon="market" />
              </Row>
            </Stack>
            <Link href="/market" className="pk-shelfshow__tiles" aria-label="Browse the Market">
              {SHELF.map((thing) => (
                <ItemTile
                  key={thing.name}
                  name={thing.name}
                  kind={thing.kind}
                  rarity={thing.rarity}
                  price={`${formatUnits(marketPrice(thing.item)!, 9, 4)} SOL`}
                  art={thing.art}
                />
              ))}
            </Link>
          </div>
        </section>

        <section className="pk-band pk-landing__band">
          <div className="pk-solana">
            <div className="pk-split pk-split--wide-left">
              <Stack gap={5}>
                <div>
                  <h2 className="display-m" style={{ color: "var(--ink-inverse)", maxWidth: "15ch" }}>
                    Keep them on Solana.
                  </h2>
                  <p className="body-lg pk-solana__muted" style={{ marginTop: "var(--space-3)", maxWidth: "42ch" }}>
                    When you want a record that outlives this browser, one signature moves your pet into
                    Pawket&apos;s program. From then on, anyone can check their care.
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

        <section className="pk-band pk-landing__band">
          <div className="pk-landing__intro">
            <h2 className="display-m">What you actually own</h2>
            <p className="body-lg pk-muted">In plain words, before you spend a thing.</p>
          </div>
          <div className="pk-owned">
            {OWNED.map((column) => (
              <section key={column.title} className={column.paper ? "pk-owned__col pk-owned__col--paper" : "pk-owned__col"}>
                <h3 className="title">{column.title}</h3>
                <p className="body-sm pk-muted">{column.note}</p>
                <ul>
                  {column.things.map((thing) => (
                    <li key={thing} className="body-sm">
                      {thing}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <details className="pk-fold pk-owned__more">
            <summary>
              <span className="title">The whole asset model</span>
              <span className="caption pk-faint">Every thing, what it is for, and whether it has a price</span>
            </summary>
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
          </details>
        </section>

        <section className="pk-band pk-landing__band">
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
            <Link href="/privacy" className="pk-landing__link">
              Privacy
            </Link>
          </nav>
          <span className="pk-landing__theme--foot">
            <ThemeButton />
          </span>
          <NetworkBadge />
        </Stack>
        <p className="body-sm pk-faint">
          Pawket is a game you play in this browser. The pet you adopt is saved here, and clearing
          this browser&apos;s data removes them — unless you keep them on Solana, where the program
          holds the record. A guild&apos;s coin is optional, never touches a pet, and is promised no value by anyone.
          Write to us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
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
    const out = pets.filter((entry) => toCompanionRecord(entry).streak.lastDay === today).length;
    figures = [
      { k: "Pets kept on Solana", v: String(pets.length) },
      { k: "Cares recorded", v: String(pets.reduce((sum, entry) => sum + entry.passport.careCount, 0)) },
      // A quiet day is said by leaving the count out, never by rounding it up.
      ...(out > 0 ? [{ k: "Cared for today", v: String(out) }] : []),
      { k: "Network fee", v: sponsor?.available ? "Paid by Pawket" : "A little devnet SOL" },
    ];
  } catch {
    figures = null;
  }
  if (!figures) {
    return <p className="body-sm pk-muted">Solana did not answer just now. The record is unchanged.</p>;
  }
  return (
    <Paper title={`On Solana ${getPublicEnv().solanaCluster}, right now`} meta="Read from the program">
      <dl className="pk-live">
        {figures.map((figure) => (
          <div key={figure.k} className="pk-live__fig">
            <dt className="receipt-label">{figure.k}</dt>
            <dd className="amount">{figure.v}</dd>
          </div>
        ))}
      </dl>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
        Guilds, coins, the Market and the rest, counted the same way: <Link href="/pulse">Pawket&apos;s pulse</Link>.
      </p>
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
          <p className="display-s" style={{ overflowWrap: "break-word" }}>
            {best.pet.name}
          </p>
          <p className="body-sm pk-muted">
            {SPECIES_LABEL[best.pet.species]} · {PERSONALITY_LABEL[best.pet.personality]}, the most cared-for pet on Solana right now
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
