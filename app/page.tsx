import { NavLink as Link } from "@/components/pk/nav-link";
import Image from "next/image";
import { Suspense } from "react";
import {
  ButtonLink,
  Chip,
  Icon,
  Mark,
  Paper,
  PawArt,
  PetArt,
  PetFrame,
  Receipt,
  Row,
  Stack,
  ThemeButton,
  WearableArt,
  type IconName,
} from "@/components/pk";
import { DressUp } from "@/components/landing/dress-up";
import { HeroWindow } from "@/components/landing/hero-window";
import { LiveStrip } from "@/components/landing/live-strip";
import { SectionMark } from "@/components/landing/section-mark";
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
import { NEWS } from "@/config/news";
import { Obstacle, Star, Treat } from "@/components/play/game-art";
import { PERSONALITY_LABEL, SPECIES_LABEL, SPECIES_SKY, petLook } from "@/lib/game/appearance";
import { projectGuestPet } from "@/lib/guest/pet";
import { toCompanionRecord } from "@/lib/solana/accounts";
import { formatAgo, truncateAddress } from "@/lib/utils/format";
import { readAllPets } from "@/server/solana";

export const revalidate = 60;

const ON_SOLANA: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "paw", title: "One signature to move in", body: "Their name, species and temperament come along. Local progress is not imported; their Solana record starts at level 1 with a fresh streak." },
  { icon: "spark", title: "Fees covered while we can", body: "While Pawket's sponsor is up, it pays fees and rent, so a Pawket Wallet can start empty." },
  { icon: "bolt", title: "One approval, then no pop-ups", body: "Link once, and this browser signs care, rounds and outfits inside the limits you set." },
  { icon: "doc", title: "A Passport anyone can open", body: "The streak, the counts and the last eight cares, public at the pet's address." },
  { icon: "image", title: "A keepsake card", body: "A frozen card in your wallet that points at the pet. It cannot be sold or sent." },
];

const OWNED: Array<{ title: string; note: string; things: string[]; paper?: boolean; tag: string; icon: IconName }> = [
  { title: "Free, no wallet", note: "Yours from the first tap, kept in this browser.", things: ["Your pets, as many as you adopt", "Their room and its things", "Five coats each, and clothes to start", "Every game and every round"], tag: "kept in this browser", icon: "paw" },
  { title: "On Solana, if you choose", note: "Public care records, and nothing to sell.", things: ["Their Passport: care from then on, the streak", "A keepsake card that cannot be sold", "A guild, joined and left for free"], tag: "a public record", icon: "doc" },
  { title: "Costs SOL, if you choose", note: "Fixed prices, stated before you approve.", things: ["Market looks: pieces, rooms, frames", "A guild's coin: optional, and it can fall to nothing"], paper: true, tag: "a fixed price", icon: "wallet" },
];

const SHELF = [
  { name: "Halo", kind: "Foil piece", rarity: "foil", item: wearableItem("halo"), art: <WearableArt id="halo" className="pk-tile__piece" /> },
  { name: "Wizard hat", kind: "Foil piece", rarity: "foil", item: wearableItem("wizard-hat"), art: <WearableArt id="wizard-hat" className="pk-tile__piece" /> },
  { name: "Blossom", kind: "Glass room", rarity: "glass", item: roomItem("blossom")!, art: <span className="pk-market-room" data-theme-preview="blossom" aria-hidden="true" /> },
  { name: "Starry night", kind: "Copper frame", rarity: "copper", item: PHOTO_FRAMES.find((frame) => frame.id === "starry")!.item, art: <FrameArt id="starry" className="pk-market-frame" /> },
  { name: "Star pin", kind: "Cloth piece", rarity: "cloth", item: wearableItem("star-pin"), art: <WearableArt id="star-pin" className="pk-tile__piece" /> },
] as const;

const ROOM_THINGS = ["sea-painting", "sunflower", "cloud-bed", "wall-clock", "round-rug", "bookcase"];

const ASSET_COLUMNS = ["Thing", "What it is for", "Needed to play?", "Has a market price?"];

const ASSETS = [
  ["Your pets", "Identity, appearance, care, progress — as many as you adopt", "No — they start in this browser", "No"],
  ["Its record on Solana", "Care from then on, the streak and the level, checked by a program whose rules can be upgraded", "No — keeping it there is your choice", "No"],
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

export default function LandingPage() {
  return (
    <div className="pk-landing">
      <a href="#main" className="pk-btn pk-btn--quiet pk-btn--sm pk-skip">
        Skip to content
      </a>
      <header className="pk-band pk-landing__head">
        <div className="pk-landing__brand">
          <Mark href="/" size={32} type={22} />
          <span className="pk-landing__tagline">a living companion</span>
        </div>
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
          <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="sm" className="pk-landing__adopt" />
        </div>
      </header>

      <main id="main">
        <section className="pk-band pk-landing__hero">
          <div className="pk-hero">
            <div className="pk-hero__copy">
              <p className="pk-hero__eyebrow">
                <PawArt form="heart" />
                A living companion
              </p>
              <h1 className="display-hero pk-hero__title">
                Raise a pet. Keep every <span className="pk-hero__mark">paw print</span>.
              </h1>
              <p className="body-lg pk-muted pk-hero__lede">
                A little cat, pup or bun who grows because you show up. Care for them, make their room
                theirs, play a round together — and keep new care on Solana if you like.
              </p>
              <div className="pk-hero__go">
                <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
                <ButtonLink label="See the park" href="/park" tone="quiet" icon="users" size="lg" />
              </div>
              <Link href="/new" className="pk-hero__new">
                <Icon name="spark" size={16} />
                <span>
                  New: {NEWS[0].title.charAt(0).toLowerCase()}
                  {NEWS[0].title.slice(1)}
                </span>
                <Icon name="right" size={14} />
              </Link>
              <div className="pk-hero__note">
                <p className="body-sm pk-faint">
                  Free to start. No wallet, no token: they live in this browser until you choose otherwise.
                </p>
                <Chip label={`Live on Solana ${getPublicEnv().solanaCluster}`} tone="pool" icon="check" />
              </div>
            </div>
            <div className="pk-hero__scene">
              <HeroWindow />
            </div>
          </div>
        </section>

        <section className="pk-band pk-landing__chain" aria-label="Pawket right now">
          <Suspense fallback={<p className="receipt pk-faint">Reading the program…</p>}>
            <LiveStrip />
          </Suspense>
        </section>

        <section className="pk-band pk-landing__room">
          <SectionMark n="01" tone="sprout">
            the room
          </SectionMark>
          <div className="pk-album">
            <div className="pk-album__copy">
              <h2 className="display-m">A room that is theirs</h2>
              <p className="body-lg pk-muted">
                Hang a picture, set out a plant, roll out a rug, choose their bed. Then strike a pose and
                take a photo of the two of you.
              </p>
              <ul className="pk-album__ticks">
                <li>
                  <Icon name="image" size={16} /> Hang, plant, roll out, choose
                </li>
                <li>
                  <Icon name="heart" size={16} /> Every pet gets a room of their own
                </li>
                <li>
                  <Icon name="spark" size={16} /> The camera keeps the two of you together
                </li>
              </ul>
              <Row gap={3} wrap>
                <ButtonLink label="See the room's things" href="/market#decor" tone="quiet" icon="sofa" />
              </Row>
              <p className="body-sm pk-faint pk-album__fine">
                Looks only: none of it changes a vital, XP or a score.
              </p>
              <p className="pk-album__note">
                <Icon name="paw" size={15} />
                The room is theirs. You just help.
              </p>
            </div>
            <div className="pk-album__spread">
              <span className="pk-album__binding" aria-hidden="true" />
              <div
                className="pk-album__photos"
                aria-label="Photos taken in Pawket's rooms"
                role="region"
                tabIndex={0}
              >
                {[
                  {
                    src: "/landing/pepper.webp",
                    alt: "A photo from Pawket: the player waves beside Pepper, a ginger cat, in a room with a sea painting, a sunflower and a cloud bed.",
                  },
                  {
                    src: "/landing/biscuit.webp",
                    alt: "Biscuit, a golden pup, dancing with the player under bunting, by a monstera and a cardboard box bed.",
                  },
                  {
                    src: "/landing/mochi.webp",
                    alt: "The player kneels to pat Mochi, a mint-coated bun, on a heart rug beside a donut bed and a wall clock.",
                  },
                ].map((photo) => (
                  <figure key={photo.src} className="pk-print">
                    <span className="pk-print__tape" aria-hidden="true" />
                    <span className="pk-print__photo">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        width={1080}
                        height={966}
                        sizes="(max-width: 1023px) 78vw, 400px"
                      />
                    </span>
                  </figure>
                ))}
              </div>
              <span className="pk-album__folio" aria-hidden="true">
                the room, kept
              </span>
              <span className="pk-album__hint" aria-hidden="true">
                swipe the prints <Icon name="right" size={13} />
              </span>
            </div>
          </div>

          <div className="pk-shelf">
            <div className="pk-shelf__words">
              <p className="label">On the shelf</p>
              <p className="body-sm pk-muted">
                Thirty-four things, most of them free; each room in the Market brings one of its own.
              </p>
            </div>
            <ul className="pk-shelf__row" aria-label="A few of the room's things">
              {ROOM_THINGS.map((id) => (
                <li key={id}>
                  <DecorArt id={id} />
                </li>
              ))}
            </ul>
            <span className="pk-shelf__board" aria-hidden="true" />
          </div>
        </section>

        <section className="pk-band pk-landing__day">
          <SectionMark n="02" tone="sun">
            a day with them
          </SectionMark>
          <div className="pk-dayhead">
            <h2 className="display-m">A day with them</h2>
            <p className="body-lg pk-muted">Four things, a few minutes, and a face that remembers.</p>
          </div>
          <div className="pk-timeline" aria-label="A day with them" role="region" tabIndex={0}>
            <article className="pk-day">
              <p className="pk-day__when">
                <span className="pk-day__dot" aria-hidden="true" />
                Day one
              </p>
              <div className="pk-day__card">
                <div className="pk-day__art pk-day__art--adopt">
                  <span className="pk-day__frame">
                    <PetFrame form="cat" temper="curious" feeling="radiant" sky="warm" size="fluid" seed="Pepper" />
                    <span className="pk-day__tag">Pepper</span>
                  </span>
                  <span className="pk-day__coats" aria-hidden="true">
                    {COATS[PetSpecies.LunaCat].map((coat) => (
                      <span
                        key={coat.id}
                        style={{ background: `linear-gradient(135deg, ${coat.coat} 0 62%, ${coat.patch} 62%)` }}
                      />
                    ))}
                  </span>
                </div>
                <div className="pk-day__words">
                  <h3 className="display-s">Adopt</h3>
                  <p className="body pk-muted">
                    A cat, a pup or a bun, in one of five coats. Give them a name and a temperament: three taps.
                  </p>
                </div>
              </div>
            </article>
            <article className="pk-day">
              <p className="pk-day__when">
                <span className="pk-day__dot" aria-hidden="true" />
                Morning
              </p>
              <div className="pk-day__card">
                <div className="pk-day__art pk-day__art--care">
                  <span className="pk-day__face">
                    <PetFrame form="dog" temper="brave" feeling="hungry" sky="plain" size="fluid" still />
                  </span>
                  <Icon name="right" size={28} />
                  <span className="pk-day__face">
                    <PetFrame form="dog" temper="brave" feeling="happy" sky="plain" size="fluid" seed="Biscuit" />
                  </span>
                </div>
                <div className="pk-day__words">
                  <h3 className="display-s">Care</h3>
                  <p className="body pk-muted">
                    Feed, play, brush, rest. A need shows on their face until you meet it.
                  </p>
                </div>
              </div>
            </article>
            <article className="pk-day">
              <p className="pk-day__when">
                <span className="pk-day__dot" aria-hidden="true" />
                Afternoon
              </p>
              <div className="pk-day__card">
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
                <div className="pk-day__words">
                  <h3 className="display-s">Play</h3>
                  <p className="body pk-muted">
                    Catch, Hop, Copy and Pairs. One round a day, the same for everyone; the score stays yours.
                  </p>
                </div>
              </div>
            </article>
            <article className="pk-day">
              <p className="pk-day__when">
                <span className="pk-day__dot" aria-hidden="true" />
                Evening
              </p>
              <div className="pk-day__card">
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
                <div className="pk-day__words">
                  <h3 className="display-s">Dress</h3>
                  <p className="body pk-muted">
                    A scarf, a crown, a collar to start. Tried on in the mirror first, and never a stat.
                  </p>
                </div>
              </div>
            </article>
          </div>

          <blockquote className="pk-quote">
            <span className="pk-quote__moon" aria-hidden="true">
              <Icon name="moon" size={22} />
            </span>
            <div className="pk-quote__words">
              <p>No pet ever dies; it only misses you.</p>
              <footer>the rule under every care screen</footer>
            </div>
            <span className="pk-quote__pet" aria-hidden="true">
              <PetArt form="bun" temper="cozy" feeling="tired" pose="full" still seed="Mochi" />
            </span>
          </blockquote>
        </section>

        <section className="pk-band pk-landing__looks">
          <SectionMark n="03" tone="bloom">
            looks, never power
          </SectionMark>
          <div className="pk-looks">
            <div className="pk-looks__copy">
              <h2 className="display-m">Looks, never power</h2>
              <p className="body-lg pk-muted">
                Twenty-five pieces, twelve rooms and eight photo frames, at prices the program fixes for
                everyone. Nothing bought changes a vital, XP or a score, and nothing is resold.
              </p>
              <p className="body-sm pk-muted">
                A look is expression, not a stat. Try one on here; the Market is where a Pawket Wallet
                approves it.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="Browse the Market" href="/market" tone="quiet" icon="market" />
              </Row>
            </div>
            <DressUp />
          </div>

          <div className="pk-tags" aria-label="A few things in the Market">
            <div className="pk-tags__head">
              <p className="label">On the Market shelf</p>
              <p className="body-sm pk-faint">Fixed in the program, the same for everyone.</p>
            </div>
            <div className="pk-tags__row">
              {SHELF.map((thing) => (
                <article className="pk-tag" key={thing.name}>
                  <span className="pk-tag__art" aria-hidden="true">
                    {thing.art}
                  </span>
                  <span className="pk-tag__words">
                    <span className="pk-tag__name">{thing.name}</span>
                    <span className="pk-tag__kind">{thing.kind}</span>
                  </span>
                  <span className="pk-tag__price">
                    {formatUnits(marketPrice(thing.item)!, 9, 3)} SOL
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pk-band pk-landing__band">
          <SectionMark n="04" tone="pool">
            on solana, if you choose
          </SectionMark>
          <div className="pk-desk">
            <span className="pk-desk__light" aria-hidden="true" />
            <span className="pk-desk__ring" aria-hidden="true" />
            <div className="pk-desk__note">
              <p className="pk-desk__kicker">
                <Icon name="bolt" size={14} />
                The desk lamp is on
              </p>
              <h2 className="display-m" style={{ color: "var(--ink-inverse)", maxWidth: "15ch" }}>
                Keep them on Solana.
              </h2>
              <p className="body-lg pk-solana__muted" style={{ maxWidth: "42ch" }}>
                When you want a record that outlives this browser, keeping your pet in Pawket&apos;s
                program starts a new record at level 1 with a fresh streak. Local progress is not
                imported. From then on, anyone can check their confirmed care.
              </p>
              <Row gap={3} wrap>
                <ButtonLink label="See every pet" href="/park" tone="pool" icon="users" />
              </Row>
              <p className="body-sm pk-solana__muted pk-desk__fine">
                Keeping a pet there is optional. Nothing in this browser waits for it.
              </p>
            </div>
            <Suspense fallback={<p className="receipt pk-solana__muted">Reading a Passport…</p>}>
              <FeaturedPassport />
            </Suspense>
            <ul className="pk-desk__cards" aria-label="What keeping a pet on Solana means">
              {ON_SOLANA.map((item, index) => (
                <li key={item.title}>
                  <span className="pk-desk__num" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pk-desk__icon">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="pk-desk__words">
                    <span className="title" style={{ color: "var(--ink-inverse)" }}>
                      {item.title}
                    </span>
                    <span className="body-sm pk-solana__muted">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="pk-band pk-landing__band">
          <SectionMark n="05" tone="sun">
            what you actually own
          </SectionMark>
          <div className="pk-folder">
            <div className="pk-folder__head">
              <h2 className="display-m">What you actually own</h2>
              <p className="body-lg pk-muted">In plain words, before you spend a thing.</p>
            </div>
            <div className="pk-envelopes">
              {OWNED.map((column, index) => (
                <section
                  key={column.title}
                  className={[
                    "pk-envelope",
                    index === 1 ? "pk-envelope--chain" : "",
                    column.paper ? "pk-envelope--coin" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="pk-envelope__flap" aria-hidden="true" />
                  <span className="pk-envelope__seal" aria-hidden="true">
                    <Icon name={column.icon} size={18} />
                  </span>
                  <div className="pk-envelope__letter">
                    <h3 className="title">{column.title}</h3>
                    <p className="body-sm pk-muted">{column.note}</p>
                    <ul>
                      {column.things.map((thing) => (
                        <li key={thing} className="body-sm">
                          {thing}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="pk-envelope__tag">{column.tag}</span>
                </section>
              ))}
            </div>
            <details className="pk-fold pk-owned__more pk-dossier">
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
          </div>
        </section>

        <section className="pk-band pk-landing__band">
          <div className="pk-doorway">
            <div className="pk-doorway__copy">
              <p className="pk-doorway__eyebrow">At the end of the day</p>
              <h2 className="display-l">Who is coming home with you?</h2>
              <p className="body-lg pk-muted">Three taps. No wallet. They will be waiting tomorrow.</p>
              <ButtonLink label="Adopt a pet" href="/adopt" icon="paw" size="lg" />
            </div>
            <div className="pk-doorway__scene" aria-hidden="true">
              <span className="pk-doorway__moon">
                <Icon name="moon" size={26} />
              </span>
              <span className="pk-doorway__star pk-doorway__star--one">
                <Icon name="spark" size={11} />
              </span>
              <span className="pk-doorway__star pk-doorway__star--two">
                <Icon name="spark" size={8} />
              </span>
              <span className="pk-doorway__star pk-doorway__star--three">
                <Icon name="spark" size={13} />
              </span>
              <div className="pk-doorway__frame">
                <div className="pk-doorway__inside">
                  <div className="pk-doorway__pets">
                    <PetArt form="cat" temper="mischief" feeling="happy" wearing="star-pin" pose="full" seed="Miso" />
                    <PetArt form="bun" temper="curious" feeling="radiant" pose="full" seed="Mochi" />
                    <PetArt form="dog" temper="cozy" feeling="happy" wearing="red-collar" pose="full" seed="Noodle" />
                  </div>
                  <span className="pk-doorway__mat">welcome home</span>
                </div>
                <span className="pk-doorway__handle" />
              </div>
            </div>
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
            <Link href="/new" className="pk-landing__link">
              What&apos;s new
            </Link>
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
          this browser&apos;s data removes local pets and progress. Keeping a pet on Solana starts a separate
          record for care from then on; local progress is not imported. A guild&apos;s coin is optional, never touches a pet, and is promised no value by anyone.
          Write to us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </footer>
    </div>
  );
}

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
  const species = SPECIES_LABEL[best.pet.species];
  const personality = PERSONALITY_LABEL[best.pet.personality];
  const mrz = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(36, "<").slice(0, 36);
  return (
    <div className="pk-passport">
      <span className="pk-passport__clip" aria-hidden="true" />
      <div className="pk-passport__book">
        <span className="pk-passport__spine" aria-hidden="true">
          <PawArt form="heart" />
          <span>Pawket</span>
          <span>Passport</span>
        </span>
        <div className="pk-passport__body">
          <div className="pk-passport__head">
            <span className="pk-passport__photo">
              <PetFrame {...petLook(record, projected.mood)} sky={SPECIES_SKY[best.pet.species]} size="fluid" level={projected.level} />
            </span>
            <div className="pk-passport__who">
              <p className="pk-passport__kicker">Pet passport</p>
              <p className="pk-passport__name">{best.pet.name}</p>
              <p className="body-sm pk-muted">
                {species} · {personality}
              </p>
              <p className="body-sm pk-passport__claim">Most cared-for on Solana right now</p>
            </div>
            <span className="pk-passport__stamp" aria-hidden="true">
              <Icon name="paw" size={14} />
              <span>
                read
                <br />
                from
                <br />
                chain
              </span>
            </span>
          </div>
          <div className="pk-passport__record">
            <p className="pk-passport__recordhead">
              <span>The record</span>
              <span>{truncateAddress(best.pet.address)}</span>
            </p>
            <Receipt
              rows={[
                { k: "Level", v: String(projected.level) },
                { k: "Cares", v: String(best.passport.careCount) },
                { k: "Best run", v: `${best.passport.bestStreak} ${best.passport.bestStreak === 1 ? "day" : "days"}` },
                { k: "Rounds played", v: String(best.passport.plays) },
                { k: "Last care", v: last ? `${formatAgo(now.getTime() / 1000 - last.at)}` : "None yet" },
              ]}
            />
          </div>
          <p className="pk-passport__mrz" aria-hidden="true">
            {mrz(`P<PAWKET<${best.pet.name}`)}
            <br />
            {mrz(`${species}<${personality}<${best.passport.careCount}C`)}
          </p>
          <ButtonLink label="Open their Passport" href={`/pet/${best.pet.address}`} tone="quiet" after="right" full />
        </div>
      </div>
    </div>
  );
}
