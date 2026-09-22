import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  ButtonLink,
  PetFrame,
  Receipt,
  Row,
  Screen,
  Sheet,
  Stack,
} from "@/components/pk";
import { findDemoListing } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Adopting ${findDemoListing(id)?.name ?? "a pet"}` };
}

/**
 * The sheet is the register change. The Playroom dims and a square-cornered
 * Paper sheet rises: corner radius alone tells a player they have crossed
 * from playing into paying, before they read a word. Cancel and Pay look
 * alike on purpose — a decision that costs money gets no button that leans
 * on you.
 */
export default async function AdoptSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = findDemoListing(id);
  if (!listing) notFound();

  return (
    <>
      <Screen>
        <BackLink label="Market" href="/market" />
        <Stack gap={4}>
          <div style={{ display: "grid", placeItems: "center" }}>
            <PetFrame
              form={SPECIES_ART[listing.species]}
              rarity={listing.rarity}
              sky={listing.sky}
              size="lg"
              still
            />
          </div>
          <h1 className="display-l">{listing.name}</h1>
        </Stack>
      </Screen>

      <Sheet
        title={`Adopting ${listing.name}`}
        meta="Step 1 of 1"
        dismissHref={`/market/${listing.id}`}
        foot={
          <Row gap={2}>
            <ButtonLink label="Cancel" href={`/market/${listing.id}`} tone="paper" />
            <ButtonLink
              label={`Pay ${listing.price} SOL`}
              href={`/market/${listing.id}/done`}
              tone="paper"
            />
          </Row>
        }
      >
        <Receipt
          rows={[
            { k: "Pet", v: `${listing.name} · ${listing.summary.split(" · ")[0].toLowerCase()}` },
            { k: "Price", v: `${listing.price} SOL` },
            { k: "Network fee", v: listing.networkFee },
            { k: "Goes to", v: "Your guest account", tone: "ok" },
          ]}
          total={{ k: "Total", v: listing.total }}
          note="A fixed price. If the transaction fails or confirms late, Pawket will say so here — it will not guess. In this preview nothing is submitted."
        />
      </Sheet>
    </>
  );
}
