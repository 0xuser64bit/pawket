import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  ButtonLink,
  Chip,
  Columns,
  Paper,
  PetFrame,
  Receipt,
  Row,
  Screen,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { findDemoListing } from "@/lib/demo";
import { SPECIES_ART } from "@/lib/game/appearance";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: findDemoListing(id)?.name ?? "Market" };
}

/**
 * The price block is Paper inside a Playroom screen: square corners and
 * hairlines arrive exactly where the decision costs something, and the sun
 * button below it does the asking.
 */
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = findDemoListing(id);
  if (!listing) notFound();

  return (
    <Screen>
      <BackLink label="Market" href="/market" />

      <Columns
        split="portrait"
        pin
        first={
          <div className="pk-portrait">
            <PetFrame
              form={SPECIES_ART[listing.species]}
              rarity={listing.rarity}
              sky={listing.sky}
              size="lg"
              mood={listing.mood}
              still
            />
          </div>
        }
        second={
          <>
            <div>
              <h1 className="display-l">{listing.name}</h1>
              <p className="body-sm pk-muted">{listing.summary}</p>
            </div>

            <Row gap={2} wrap>
              {listing.traits.map((trait) => (
                <Chip key={trait} label={trait} />
              ))}
            </Row>

            <Paper title="Price" meta="Fixed">
              <Receipt
                rows={[
                  { k: "Pet", v: `${listing.price} SOL` },
                  { k: "Network fee", v: listing.networkFee },
                  { k: "Seller", v: "Pawket · first adoption" },
                ]}
                total={{ k: "Total", v: listing.total }}
              />
            </Paper>

            <ButtonLink
              label={`Adopt ${listing.name}`}
              href={`/market/${listing.id}/adopt`}
              size="lg"
              full
              icon="paw"
            />
            <p className="caption pk-faint" style={{ textAlign: "center" }}>
              Dress, rename and rehome her later. Nothing here is final.
            </p>

            <PreviewNote what="This listing and its price are fixtures." />
          </>
        }
      />
    </Screen>
  );
}
