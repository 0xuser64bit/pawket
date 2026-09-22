import type { Metadata } from "next";
import {
  Banner,
  ButtonLink,
  Card,
  Chip,
  ChipLink,
  EmptyState,
  Field,
  ItemTile,
  PetFrame,
  Row,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  Tabs,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { GUILD_ITEMS, LISTING_FILTERS, PLAYER, SHOP_ITEMS, findItems, findListings } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export const metadata: Metadata = { title: "Market" };

const TABS = [
  { key: "pets", label: "Pets" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "backdrops", label: "Backdrops" },
  { key: "guild", label: "Guild" },
];

/** A market address that keeps whatever the player has already narrowed. */
function marketHref(params: { tab: string; filter?: string; q?: string }) {
  const search = new URLSearchParams({ tab: params.tab });
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  return `/market?${search}`;
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string; q?: string }>;
}) {
  const { tab = "pets", filter = "all", q = "" } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab : "pets";
  const query = q.trim();

  const listings = findListings({ filter, q: query });
  const items = findItems(
    active === "backdrops"
      ? SHOP_ITEMS.filter((item) => item.kind === "Backdrop" || item.kind === "Sound")
      : SHOP_ITEMS,
    query,
  );
  const guildItems = findItems(GUILD_ITEMS, query);

  const nothing = (
    <EmptyState
      icon="search"
      title="Nothing matches"
      body={
        query
          ? `Nothing here goes by “${query}”. Try a name, a trait or a slot.`
          : "Nothing is listed under this filter right now."
      }
      action={<ButtonLink label="Show everything" href={marketHref({ tab: active })} tone="quiet" />}
    />
  );

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Market</h1>
        {/* A balance is a figure, so it is set on Paper, in mono. */}
        <Chip label={`${PLAYER.balance} SOL`} tone="paper" icon="wallet" />
      </ScreenBar>

      <Stack gap={4}>
        <div className="pk-toolbar">
          <form action="/market" role="search">
            <input type="hidden" name="tab" value={active} />
            {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
            <Field
              label="Search the market"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search pets, traits, cosmetics"
            />
          </form>
          <Tabs
            label="What to browse"
            active={active}
            items={TABS.map((t) => ({ ...t, href: marketHref({ tab: t.key, q: query }) }))}
          />
        </div>

        {active === "pets" ? (
          <Stack gap={4}>
            <Row gap={2} wrap>
              {LISTING_FILTERS.map((f) => (
                <ChipLink
                  key={f.key}
                  label={f.label}
                  href={marketHref({ tab: "pets", filter: f.key, q: query })}
                  selected={f.key === filter}
                />
              ))}
            </Row>

            {listings.length ? (
              <div className="pk-cards">
                {listings.map((listing) => (
                  <Card key={listing.id} href={`/market/${listing.id}`} variant="flush">
                    <div className="pk-card__art">
                      <PetFrame
                        form={SPECIES_ART[listing.species]}
                        rarity={listing.rarity}
                        sky={listing.sky}
                        size="fluid"
                        still
                      />
                    </div>
                    <div className="pk-card__body">
                      <h2 className="title">{listing.name}</h2>
                      <p className="caption pk-faint">{listing.traits.join(" · ")}</p>
                      <div className="pk-spread" style={{ marginTop: "var(--space-2)" }}>
                        <span className="amount">{listing.price}</span>
                        <span className="caption pk-faint">SOL</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              nothing
            )}
          </Stack>
        ) : null}

        {active === "cosmetics" || active === "backdrops" ? (
          <Stack gap={3}>
            <SectionLabel count={`${items.length}`}>
              {active === "backdrops" ? "Backdrops and sound" : "Cosmetics"}
            </SectionLabel>
            {items.length ? (
              <div className="pk-tiles">
                {items.map((item) => (
                  <ItemTile
                    key={item.id}
                    name={item.name}
                    kind={item.kind}
                    rarity={item.rarity}
                    icon={item.icon}
                    price={item.price}
                  />
                ))}
              </div>
            ) : (
              nothing
            )}
          </Stack>
        ) : null}

        {active === "guild" ? (
          <Stack gap={3}>
            <SectionLabel tone="bloom" count={`${guildItems.length}`}>
              From a guild
            </SectionLabel>
            {guildItems.length ? (
              <div className="pk-tiles">
                {guildItems.map((item) => (
                  <ItemTile
                    key={item.id}
                    name={item.name}
                    kind={item.kind}
                    rarity={item.rarity}
                    icon={item.icon}
                    price="0.30"
                  />
                ))}
              </div>
            ) : (
              nothing
            )}
          </Stack>
        ) : null}

        <div className="pk-notes">
          {active === "pets" ? (
            <Banner
              tone="info"
              title="Plain prices, plain sales"
              body="Adopting a pet is a fixed price in SOL. No curve, no auction, no slippage — trading mechanics never touch adoption."
            />
          ) : null}
          {active === "cosmetics" || active === "backdrops" ? (
            <Banner
              tone="info"
              title="Anything you own fits any pet you own"
              body="Cosmetics change how a pet looks and where it lives. None of them changes a stat, a speed or a score."
            />
          ) : null}
          {active === "guild" ? (
            <Banner
              tone="guild"
              title="Guild items depend on membership"
              body="Leave the guild and these stop being wearable. Everything you bought outright stays yours either way."
            />
          ) : null}
          <PreviewNote what="These listings, prices and balances are fixtures." />
        </div>
      </Stack>
    </Screen>
  );
}
