"use client";

import { useState, useSyncExternalStore } from "react";
import type { Address } from "@solana/kit";
import { Button, ButtonLink, Choice, EmptyState, Field, ItemTile, PetArt, RARITY_LABEL, Receipt, SectionLabel, Sheet, Stack, WearableArt, setTheme, useThemeChoice, type Rarity, Problem } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { THEMES, roomItem, type ThemeId } from "@/config/themes";
import { MARKET_WEARABLES, wearableItem } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { projectGuestPet } from "@/lib/guest/pet";
import { PHOTO_FRAMES } from "@/lib/market/frames";
import { SHELF_FILTERS, isShelfFilter, onShelf, type ShelfEntry, type ShelfFilter } from "@/lib/market/shelf";
import { FrameArt } from "./frame-art";
import { DecorArt } from "@/components/home/decor-art";
import { DECOR, SLOT_LABEL, decorOpen, placeDecor, useRoomDecor, type DecorPiece } from "@/lib/room/decor";
import { useHere } from "@/lib/native/android";
import { useCloset } from "@/lib/market/use-closet";
import { useConnected } from "@/lib/solana/browser-client";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { getBuyWithWalletInstruction, marketPrice } from "@/lib/solana/instructions";
import { deriveClosetPda, deriveWalletPda } from "@/lib/solana/pda";
import { MARKET } from "@/lib/solana/program";
import { usePawketSend, useSponsor } from "@/lib/solana/use-send";
import { formatUnits } from "@/lib/utils/format";
import { DevnetFaucet } from "@/components/wallet/faucet";

/**
 * The Market: looks for SOL, at the prices Pawket's program fixes for
 * everyone. The shelves are the screen; a tap on anything opens it as a
 * sheet — your own pet wearing it, or sitting in the room — with its price
 * and where the SOL goes, on Paper, and one button. A purchase is one signed
 * transaction: the price from the buyer's Pawket Wallet straight to Pawket's
 * treasury, the item into their closet on Solana for good. Pawket's sponsor
 * pays the network fee and the closet's rent. Nothing here changes a vital,
 * XP, a cooldown or a score, and nothing is resold.
 */

interface Item extends ShelfEntry {
  /** A Market item id, or a room thing's own id (`decor`): nothing on Solana, nothing sold. */
  id: number | string;
  art: React.ReactNode;
  /** A room thing, placed on this device. */
  decor?: DecorPiece;
  /** The catalog id of a piece, to try it on. */
  piece?: string;
  room?: ThemeId;
}

const PIECES: Item[] = MARKET_WEARABLES.map((piece) => ({
  id: wearableItem(piece.id),
  name: piece.name,
  line: "For any of your pets on Solana. Looks only.",
  kind: "piece",
  tags: [piece.place, piece.kind, piece.price === MARKET.classicPrice ? "cloth" : "foil"],
  piece: piece.id,
  art: <WearableArt id={piece.id} className="pk-tile__piece" />,
}));

const ROOMS: Item[] = THEMES.filter((theme) => roomItem(theme.id) !== null).map((theme) => ({
  id: roomItem(theme.id)!,
  name: theme.name,
  line: theme.line,
  kind: "room",
  tags: [theme.scheme, "glass"],
  room: theme.id,
  art: <span className="pk-market-room" data-theme-preview={theme.id} aria-hidden="true" />,
}));

const FRAMES: Item[] = PHOTO_FRAMES.map((frame) => ({
  id: frame.item, name: frame.name, line: frame.line, kind: "frame", tags: ["copper", "photo"],
  art: <FrameArt id={frame.id} className="pk-market-frame" />,
}));

/** Words a room thing is found by, beyond its name and line. */
const DECOR_WORDS: Record<DecorPiece["slot"], string[]> = {
  wall: ["wall", "painting", "picture", "art"],
  corner: ["plant", "corner", "pot"],
  rug: ["rug", "floor", "carpet"],
  bed: ["bed", "nap", "sleep"],
  side: ["furniture", "lamp", "shelf"],
};

const roomOf = (piece: DecorPiece) => THEMES.find((theme) => theme.id === piece.room);

const THINGS: Item[] = DECOR.map((piece) => ({
  id: piece.id,
  name: piece.name,
  line: piece.line,
  kind: "decor",
  tags: [...DECOR_WORDS[piece.slot], ...(piece.room ? [piece.room, "glass"] : ["free"])],
  decor: piece,
  art: <DecorArt id={piece.id} className="pk-market-decor" />,
}));

const SHELVES: ReadonlyArray<{ label: string; items: Item[]; note?: string }> = [
  { label: "For your pets", items: PIECES },
  { label: "Rooms", items: ROOMS },
  {
    label: "For your room",
    items: THINGS,
    note: "A picture, a plant, a rug, a bed and more, placed from Home. Most are free; each room above brings one of its own.",
  },
  { label: "For your photos", items: FRAMES, note: "Frame a moment with your pet. Save it or share it from Home." },
];

const sol = (lamports: bigint | string) => `${formatUnits(lamports, 9, 4)} SOL`;

/** The address's #fragment, so a link can open the Market narrowed (`/market#room`); "" on the server. */
function useFragment(): string {
  return useSyncExternalStore(
    (changed) => {
      window.addEventListener("hashchange", changed);
      return () => window.removeEventListener("hashchange", changed);
    },
    () => window.location.hash.slice(1),
    () => "",
  );
}

/**
 * Each shelf's material, so the trim says what kind of thing it is: the
 * classic pieces are cloth, the rest of the pieces foil, rooms glass and
 * frames copper. Looks only; it is written beside the price.
 */
function rarityOf(item: Item): Rarity {
  if (item.kind === "room" || item.decor?.room) return "glass";
  if (item.kind === "decor") return "cloth";
  if (item.kind === "frame") return "copper";
  return marketPrice(item.id as number) === MARKET.classicPrice ? "cloth" : "foil";
}

export function MarketScreen() {
  const cluster = getPublicEnv().solanaCluster;
  const connected = useConnected();
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const closet = useCloset(owner);
  const choice = useThemeChoice();
  const decor = useRoomDecor();
  const [picked, setPicked] = useState<Item | null>(null);
  const owned = new Set(closet.data?.items ?? []);
  /** Whether the closet holds it: a room's thing once the room is there; a free thing is nobody's purchase. */
  const holds = (item: Item) => (item.decor ? Boolean(item.decor.room) && decorOpen(item.decor, owned) : owned.has(item.id as number));
  const [query, setQuery] = useState("");
  const fragment = useFragment();
  const filter: ShelfFilter = isShelfFilter(fragment) ? fragment : "all";
  const narrowing = query.trim() !== "" || filter !== "all";
  const shelves = SHELVES.map((shelf) => ({ ...shelf, shown: shelf.items.filter((item) => onShelf(item, query, filter, holds(item))) }));
  const found = shelves.reduce((sum, shelf) => sum + shelf.shown.length, 0);

  /** The address holds the shelf, so a narrowed Market can be linked to, and comes back on reload. */
  function narrow(next: ShelfFilter) {
    window.history.replaceState(window.history.state, "", next === "all" ? window.location.pathname : `#${next}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function showEverything() {
    setQuery("");
    narrow("all");
  }

  const tile = (item: Item) => {
    if (item.decor) {
      const piece = item.decor;
      const open = decorOpen(piece, owned);
      return (
        <button key={item.id} type="button" className="pk-tile-hit" aria-haspopup="dialog" onClick={() => setPicked(item)}>
          <ItemTile
            name={item.name}
            kind={piece.room ? (open ? "With your room" : `With ${roomOf(piece)?.name}`) : SLOT_LABEL[piece.slot]}
            rarity={rarityOf(item)}
            price={piece.room ? undefined : "Free"}
            art={item.art}
            equipped={decor[piece.slot] === piece.id}
          />
        </button>
      );
    }
    const has = owned.has(item.id as number);
    return (
      <button key={item.id} type="button" className="pk-tile-hit" aria-haspopup="dialog" onClick={() => setPicked(item)}>
        <ItemTile
          name={item.name}
          kind={has ? "In your closet" : `${RARITY_LABEL[rarityOf(item)]} ${item.kind}`}
          rarity={rarityOf(item)}
          price={has ? undefined : sol(marketPrice(item.id as number)!)}
          art={item.art}
          equipped={has && item.room === choice}
        />
      </button>
    );
  };

  return (
    <Stack gap={6}>
      <search className="pk-market-find" aria-label="Find in the Market">
        <Field
          label="Search the Market"
          type="search"
          placeholder="Hats, pink rooms, glasses…"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Choice label="Show" hideLabel className="pk-market-filters" options={SHELF_FILTERS} value={filter} onPick={narrow} />
        {/* Said once the shelves settle, not drawn: the counts beside each shelf already show it. */}
        <p className="pk-sr" role="status">
          {narrowing ? `${found} ${found === 1 ? "thing" : "things"} on the shelves` : ""}
        </p>
      </search>

      {found === 0 ? (
        <EmptyState
          icon="search"
          title={filter === "yours" && !owner ? "Your closet is on Solana" : "Nothing on the shelves matches"}
          body={
            filter === "yours" && !owner
              ? "Connect the wallet that bought them, and what is yours shows here."
              : filter === "yours" && !query.trim()
                ? "Nothing bought yet. Everything you buy stays in your closet, for any of your pets."
                : `Nothing here is called “${query.trim() || "that"}”${filter === "all" ? "" : ` in ${SHELF_FILTERS.find((each) => each.value === filter)!.label.toLowerCase()}`}. Try a shorter word, or another shelf.`
          }
          action={<Button label="Show everything" tone="quiet" size="sm" onClick={showEverything} />}
        />
      ) : (
        shelves.map((shelf) =>
          shelf.shown.length ? (
            <Stack key={shelf.label} gap={3}>
              <SectionLabel count={narrowing ? `${shelf.shown.length} of ${shelf.items.length}` : `${shelf.items.length}`}>{shelf.label}</SectionLabel>
              {shelf.note && !narrowing ? <p className="body-sm pk-muted">{shelf.note}</p> : null}
              <div className="pk-tiles">{shelf.shown.map(tile)}</div>
            </Stack>
          ) : null,
        )
      )}

      <details className="pk-fold">
        <summary>
          <span className="title">Where the SOL goes</span>
          <span className="caption pk-faint">Prices fixed in Pawket&apos;s program, the same for everyone</span>
        </summary>
        <Stack gap={3}>
          <div className="pk-receipt">
            <div className="pk-receipt__row">
              <span className="pk-receipt__k">Pawket&apos;s treasury</span>
              <AddressLine value={MARKET.treasury} label="treasury" href={explorerAddressUrl(MARKET.treasury, cluster)} />
            </div>
            {closet.data ? (
              <>
                <div className="pk-receipt__row">
                  <span className="pk-receipt__k">In your closet</span>
                  <span className="pk-receipt__v">{closet.data.count}</span>
                </div>
                <div className="pk-receipt__row">
                  <span className="pk-receipt__k">You have paid in</span>
                  <span className="pk-receipt__v">{sol(closet.data.spent)}</span>
                </div>
              </>
            ) : null}
          </div>
          <p className="body-sm pk-muted">
            Every sale goes from the buyer&apos;s Pawket Wallet straight to the treasury; only an upgrade of the program changes a
            price. The treasury pays the network fees Pawket covers for everyone&apos;s pets.
          </p>
        </Stack>
      </details>

      {picked?.decor ? (
        <DecorSheet
          piece={picked.decor}
          open={decorOpen(picked.decor, owned)}
          placed={decor[picked.decor.slot] === picked.decor.id}
          onRoom={() => setPicked(ROOMS.find((room) => room.room === picked.decor!.room) ?? null)}
          onDismiss={() => setPicked(null)}
        />
      ) : picked ? (
        <ItemSheet
          item={picked}
          owner={owner}
          canSign={Boolean(connected?.signer)}
          has={owned.has(picked.id as number)}
          onBought={closet.refresh}
          onDismiss={() => setPicked(null)}
        />
      ) : null}
    </Stack>
  );
}

/** One thing in the Market, as a sheet: drawn on your own pet or as the room, its price on Paper, one button. */
function ItemSheet({
  item,
  owner,
  canSign,
  has,
  onBought,
  onDismiss,
}: {
  item: Item;
  owner: Address | null;
  canSign: boolean;
  has: boolean;
  onBought: () => void;
  onDismiss: () => void;
}) {
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const { pet } = useCompanion();
  const [connecting, setConnecting] = useState(false);
  const price = marketPrice(item.id as number)!;
  const balance = sender.pawketWallet?.balance;
  const short = owner !== null && balance !== undefined && balance < price;
  const needsLink = owner !== null && !sender.pawketWallet?.linked;
  // Your own pet, wearing it — or in the room — before anything is signed.
  const look = pet ? petLook(pet, projectGuestPet(pet).mood) : ({ form: "cat", temper: "curious", feeling: "happy", wearing: null, seed: item.name } as const);

  async function buy() {
    if (!owner) return;
    const address = (await deriveClosetPda(owner)).address;
    const wallet = (await deriveWalletPda(owner)).address;
    const result = await sender.send(`Buy the ${item.name.toLowerCase()}`, ({ owner: signer, payer }) => [
      getBuyWithWalletInstruction({ owner: signer, payer, closet: address, wallet, item: item.id as number }),
    ]);
    if (result?.outcome === "confirmed") {
      onBought();
    }
  }

  if (connecting) {
    return <WalletSheet why="Connect your wallet, then link and fund Pawket Wallet. Your wallet approves purchases; Pawket Wallet pays." onDismiss={() => setConnecting(false)} />;
  }

  return (
    <Sheet
      title={item.name}
      meta={has ? "In your closet" : "Fixed price"}
      onDismiss={onDismiss}
      foot={(dismiss) => (
        <div className="pk-spread">
          <Button tone="paper" label={has ? "Done" : "Not now"} onClick={dismiss} />
          {!owner ? (
            <Button label="Connect a wallet" icon="wallet" tone="paper" onClick={() => setConnecting(true)} />
          ) : has ? (
            item.room ? (
              <Button label={`Live in ${item.name}`} tone="paper" onClick={() => setTheme(item.room!)} />
            ) : null
          ) : needsLink || short ? (
            <ButtonLink tone="paper" label={needsLink ? "Set up Pawket Wallet" : "Add SOL to Pawket Wallet"} href={needsLink ? "/wallet" : "/wallet#put-in"} />
          ) : (
            <Button label={`Buy for ${sol(price)}`} tone="paper" disabled={sender.busy || !canSign || short} onClick={() => void buy()} />
          )}
        </div>
      )}
    >
      <Stack gap={4}>
        <div className="pk-market-try" data-theme-preview={item.room} aria-hidden="true">
          {item.kind === "frame" ? item.art : <PetArt {...look} wearing={item.piece ?? look.wearing} pose="full" />}
        </div>
        <div>
          <h2 className="title">{item.name}</h2>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-1)" }}>
            {item.kind === "room" ? `${item.line} For every device of this wallet, once bought.` : item.line}
            {pet && item.piece ? ` That is ${pet.name}, trying it on.` : ""}
          </p>
        </div>
        <Receipt
          rows={[
            { k: "Price", v: sol(price), tone: "warn" },
            { k: "Paid from", v: "Pawket Wallet" },
            { k: "Goes to", v: "Pawket's treasury" },
            { k: "Network fee", v: sponsor.data?.available ? "Paid by Pawket" : "From Pawket Wallet’s device" },
            { k: "Your closet's rent", v: sponsor.data?.available ? "Paid by Pawket, the first time" : "A little devnet SOL, the first time" },
          ]}
          note="Looks only: it changes no vital, XP, cooldown or score. It stays in your closet on Solana; Pawket does not buy it back."
        />
        {has && item.kind === "frame" ? <p className="body-sm pk-muted">Ready for your next photo. Open Photo on Home and choose this frame.</p> : null}
        {has && item.piece ? <p className="body-sm pk-muted">Yours. Put it on from the wardrobe in Profile.</p> : null}
        {!has && short ? (
          <Problem>
            Your Pawket Wallet holds {sol(balance ?? 0n)}. Add SOL there before buying.<DevnetFaucet /> Nothing was sent.
          </Problem>
        ) : null}
      </Stack>
    </Sheet>
  );
}

/**
 * A room thing, as a sheet: drawn large, what it is, and the one thing to do
 * with it — place it in the room on this device, or, for a thing that comes
 * with a Market room not yet bought, see that room. Nothing here is a sale,
 * so there is no price and no Paper.
 */
function DecorSheet({
  piece,
  open,
  placed,
  onRoom,
  onDismiss,
}: {
  piece: DecorPiece;
  open: boolean;
  placed: boolean;
  onRoom: () => void;
  onDismiss: () => void;
}) {
  const { here } = useHere();
  const [said, setSaid] = useState<string>();
  const room = roomOf(piece);
  return (
    <Sheet
      title={piece.name}
      meta={piece.room ? `With the ${room?.name} room` : "Free"}
      register="room"
      onDismiss={onDismiss}
      foot={(dismiss) => (
        <>
          <div className="pk-spread">
            <Button tone="quiet" label={placed ? "Done" : "Not now"} onClick={dismiss} />
            {!open ? (
              <Button label={`See the ${room?.name} room`} onClick={onRoom} />
            ) : placed ? (
              <ButtonLink label="See it at home" icon="home" href="/home" />
            ) : (
              <Button
                label="Place in your room"
                icon="sofa"
                onClick={() => setSaid(placeDecor(piece.slot, piece.id) ? undefined : `${here === "this app" ? "This app" : "This browser"} did not keep it. Your room is as it was.`)}
              />
            )}
          </div>
          <p role="status" className="caption pk-faint" style={{ marginTop: said || placed ? "var(--space-2)" : 0 }}>
            {said ?? (placed ? `In your room: ${SLOT_LABEL[piece.slot].toLowerCase()}. Change it any time from Home, under Decor.` : "")}
          </p>
        </>
      )}
    >
      <Stack gap={4}>
        <div className="pk-market-try pk-market-try--decor" aria-hidden="true">
          <DecorArt id={piece.id} />
        </div>
        <div>
          <h2 className="title">{piece.name}</h2>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-1)" }}>
            {piece.line}{" "}
            {piece.room
              ? open
                ? `It came with your ${room?.name} room.`
                : `It comes with the ${room?.name} room: buy the room once, and this is yours too, on every device of the wallet.`
              : `Free, for everyone. It stays in your room in ${here}.`}
          </p>
        </div>
        <p className="body-sm pk-muted">Looks only: it changes no vital, XP, cooldown or score.</p>
      </Stack>
    </Sheet>
  );
}
