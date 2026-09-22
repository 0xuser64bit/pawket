import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Banner,
  Button,
  ButtonLink,
  Columns,
  PetFrame,
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
  return { title: `${findDemoListing(id)?.name ?? "Your pet"} is home` };
}

/**
 * Confirmation is a fact, not a celebration. No confetti, no rising number:
 * a pool banner states the amount and the signature, and the joy is the
 * animal above it.
 */
export default async function AdoptDonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = findDemoListing(id);
  if (!listing) notFound();

  return (
    <Screen>
      <Columns
        split="portrait"
        className="pk-arrival"
        first={
          <div className="pk-portrait">
            <PetFrame
              form={SPECIES_ART[listing.species]}
              rarity={listing.rarity}
              sky={listing.sky}
              size="lg"
              name={listing.name}
              level={1}
              mood="New"
            />
          </div>
        }
        second={
          <>
            <div>
              <h1 className="display-m">{listing.name} is home.</h1>
              <p className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
                She is in your Inventory and can move into your room whenever you like.
              </p>
            </div>

            {/* Qualified before the banner states an amount, never after. */}
            <PreviewNote what="No payment was made and no transaction was sent." />

            <Banner
              tone="done"
              title={`Paid ${listing.total}`}
              body="Signature 4xQe…T7mP · confirmed on-chain."
              action={<Button label="Receipt" tone="paper" disabled />}
            />

            <Row gap={3} wrap>
              <ButtonLink label="Take her home" href="/home" icon="home" size="lg" />
              <ButtonLink label="Dress her" href="/inventory?tab=cosmetics" tone="quiet" size="lg" />
            </Row>
          </>
        }
      />
    </Screen>
  );
}
