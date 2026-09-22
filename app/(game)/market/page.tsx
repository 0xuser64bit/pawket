import type { Metadata } from "next";
import {
  Banner,
  Card,
  Chip,
  ChipLink,
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
import { DEMO_LISTINGS, GUILD_ITEMS, PLAYER, SHOP_ITEMS } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export const metadata: Metadata = { title: "Market" };

const TABS = [
  { key: "pets", label: "Pets" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "backdrops", label: "Backdrops" },
  { key: "guild", label: "Guild" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "cat", label: "Luna cat" },
  { key: "cloth", label: "Cloth" },
  { key: "cheap", label: "Under 1 SOL" },
];

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const { tab = "pets", filter = "all" } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab : "pets";

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Market</h1>
        {/* A balance is a figure, so it is set in mono wherever it appears. */}
        <Chip label={`${PLAYER.balance} SOL`} tone="plain" icon="wallet" />
      </ScreenBar>

      <Stack gap={3}>
        <Field label="Search the market" placeholder="Search pets, traits, cosmetics" />
        <Tabs
          label="What to browse"
          active={active}
          items={TABS.map((t) => ({ ...t, href: `/market?tab=${t.key}` }))}
        />

        {active === "pets" ? (
          <Stack gap={4}>
            <Row gap={2} wrap>
              {FILTERS.map((f) => (
                <ChipLink
                  key={f.key}
                  label={f.label}
                  href={`/market?tab=pets&filter=${f.key}`}
                  selected={f.key === filter}
                />
              ))}
            </Row>

            <div className="pk-cards">
              {DEMO_LISTINGS.map((listing) => (
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
                    <div className="title">{listing.name}</div>
                    <p className="caption pk-faint">{listing.traits.join(" · ")}</p>
                    <div className="pk-spread" style={{ marginTop: "var(--space-2)" }}>
                      <span className="amount">{listing.price}</span>
                      <span className="caption pk-faint">SOL</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Banner
              tone="info"
              title="Plain prices, plain sales"
              body="Adopting a pet is a fixed price in SOL. No curve, no auction, no slippage — trading mechanics never touch adoption."
            />
          </Stack>
        ) : null}

        {active === "cosmetics" || active === "backdrops" ? (
          <Stack gap={4}>
            <SectionLabel count={`${SHOP_ITEMS.length}`}>
              {active === "backdrops" ? "Backdrops and sound" : "Cosmetics"}
            </SectionLabel>
            <div className="pk-tiles">
              {SHOP_ITEMS.filter((item) =>
                active === "backdrops" ? item.kind === "Backdrop" || item.kind === "Sound" : true,
              ).map((item) => (
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
            <Banner
              tone="info"
              title="Anything you own fits any pet you own"
              body="Cosmetics change how a pet looks and where it lives. None of them changes a stat, a speed or a score."
            />
          </Stack>
        ) : null}

        {active === "guild" ? (
          <Stack gap={4}>
            <SectionLabel tone="bloom">From a guild</SectionLabel>
            <div className="pk-tiles">
              {GUILD_ITEMS.map((item) => (
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
            <Banner
              tone="guild"
              title="Guild items depend on membership"
              body="Leave the guild and these stop being wearable. Everything you bought outright stays yours either way."
            />
          </Stack>
        ) : null}

        <PreviewNote what="These listings, prices and balances are fixtures." />
      </Stack>
    </Screen>
  );
}
