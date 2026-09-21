import type { Metadata } from "next";
import Link from "next/link";
import {
  Banner,
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  ItemTile,
  PetFrame,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  Tabs,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { ACTIVE_PET, DEMO_PETS, GUILD_ITEMS, OWNED_ITEMS } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export const metadata: Metadata = { title: "Inventory" };

const TABS = [
  { key: "pets", label: "Pets" },
  { key: "cosmetics", label: "Cosmetics" },
  { key: "items", label: "Items" },
  { key: "badges", label: "Badges" },
];

/**
 * Everything you own, and what is wearing it. Owned outright sits above
 * guild-linked, under a labelled heading — a player should never discover
 * after the fact that an item was conditional.
 */
export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "pets" } = await searchParams;
  const active = TABS.some((t) => t.key === tab) ? tab : "pets";
  const badges = GUILD_ITEMS.filter((item) => item.name.includes("badge"));

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Inventory</h1>
        {active === "pets" ? (
          <span className="caption pk-faint">Sorted by level</span>
        ) : (
          <Chip label={`On ${ACTIVE_PET.name}`} tone="sun" icon="paw" />
        )}
      </ScreenBar>

      <Stack gap={4}>
        <Tabs
          label="What you own"
          active={active}
          items={TABS.map((t) => ({ ...t, href: `/inventory?tab=${t.key}` }))}
        />

        {active === "pets" ? (
          <Stack gap={3}>
            <SectionLabel count={`${DEMO_PETS.length}`}>Your pets</SectionLabel>
            <div className="pk-pair">
              {DEMO_PETS.map((pet) => (
                <Link key={pet.id} href={`/pet/${pet.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Card variant="flush">
                    <div style={{ padding: "var(--space-3) var(--space-3) 0" }}>
                      <PetFrame
                        form={SPECIES_ART[pet.species]}
                        rarity={pet.rarity}
                        sky={pet.sky}
                        size="sm"
                        still
                      />
                    </div>
                    <div style={{ padding: "10px var(--space-4) var(--space-4)" }}>
                      <div className="title">{pet.name}</div>
                      <p className="caption pk-faint">
                        Level {pet.level} · {pet.where}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <Card variant="quiet">
              <div className="pk-spread">
                <span className="title">Room for one more</span>
                <ButtonLink label="Market" href="/market" tone="quiet" size="sm" />
              </div>
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
                Pets never expire, never need feeding to survive, and never leave unless you sell them.
              </p>
            </Card>
          </Stack>
        ) : null}

        {active === "cosmetics" ? (
          <Stack gap={4}>
            <Stack gap={3}>
              <SectionLabel>Yours outright</SectionLabel>
              <div className="pk-shelf">
                {OWNED_ITEMS.map((item) => (
                  <ItemTile
                    key={item.id}
                    name={item.name}
                    kind={item.kind}
                    rarity={item.rarity}
                    icon={item.icon}
                    equipped={item.equipped}
                  />
                ))}
              </div>
            </Stack>
            <Stack gap={3}>
              <SectionLabel tone="bloom">From a guild</SectionLabel>
              <div className="pk-shelf">
                {GUILD_ITEMS.map((item) => (
                  <ItemTile
                    key={item.id}
                    name={item.name}
                    kind={item.kind}
                    rarity={item.rarity}
                    icon={item.icon}
                    equipped={item.equipped}
                  />
                ))}
              </div>
            </Stack>
            <Banner
              tone="guild"
              title="Guild items depend on membership"
              body="Leave Clover Guild and these two stop being wearable. Everything above the line stays yours either way."
            />
          </Stack>
        ) : null}

        {active === "items" ? (
          <EmptyState
            icon="pocket"
            title="Nothing in the pocket yet"
            body="Treats, name tags and event tickets land here. They are used up when you use them, and none of them changes a stat."
            action={<ButtonLink label="Look in the market" href="/market?tab=cosmetics" />}
          />
        ) : null}

        {active === "badges" ? (
          <Stack gap={3}>
            <SectionLabel tone="bloom">From a guild</SectionLabel>
            <div className="pk-shelf">
              {badges.map((item) => (
                <ItemTile
                  key={item.id}
                  name={item.name}
                  kind={item.kind}
                  rarity={item.rarity}
                  icon={item.icon}
                  equipped={item.equipped}
                />
              ))}
            </div>
            <Banner
              tone="guild"
              title="A badge is guild flair and nothing else"
              body="It shows where you spend your evenings. It does not change your pet, your progress or a game."
            />
          </Stack>
        ) : null}

        <PreviewNote what="These pets, cosmetics and badges are fixtures." />
      </Stack>
    </Screen>
  );
}
