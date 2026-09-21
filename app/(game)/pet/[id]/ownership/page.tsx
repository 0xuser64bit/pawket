import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  Banner,
  Button,
  ButtonLink,
  Paper,
  Receipt,
  Row,
  Screen,
  Stack,
} from "@/components/pk";
import { CopyButton } from "@/components/copy-button";
import { PreviewNote } from "@/components/preview-note";
import { findDemoPet } from "@/lib/demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Ownership · ${findDemoPet(id)?.name ?? "Pet"}` };
}

/**
 * The ledger is a separate room. Square corners, mono, hairlines — this page
 * states the record and nothing else: no price, no chart, no offer.
 */
export default async function OwnershipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = findDemoPet(id);
  if (!pet) notFound();

  return (
    <Screen>
      <BackLink label={pet.name} href={`/pet/${pet.id}`} />

      <Stack gap={4}>
        <div>
          <h1 className="display-m">Ownership</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
            This page states the record and nothing else — no price, no chart, no offer.
          </p>
        </div>

        {/* The claim is qualified before it is made, not after. */}
        <PreviewNote what="This record is a fixture." />

        <Paper title="On-chain record" meta={`Example · verified ${pet.record.verified}`}>
          <Receipt
            rows={[
              { k: "Token", v: pet.record.token },
              { k: "Mint", v: pet.record.mint },
              { k: "Owner", v: pet.record.owner },
              { k: "Minted", v: pet.record.minted },
              { k: "Standard", v: pet.record.standard },
              { k: "Traits", v: "Stored on-chain", tone: "ok" },
            ]}
          />
        </Paper>

        <Row gap={2} wrap>
          <CopyButton label="Copy mint" value={pet.record.mint} />
          <Button label="View on explorer" tone="paper" after="out" disabled />
        </Row>
        <p className="caption pk-faint">
          An explorer link appears once a pet is recorded on-chain. Nothing here is.
        </p>

        <Banner
          tone="info"
          title={`Selling ${pet.name} ends your care streak`}
          body="Her level, traits and history travel with the token to the next owner. Cosmetics you bought separately stay in your inventory."
        />

        <Row gap={2} wrap>
          <ButtonLink label="List for sale" href="/market" tone="quiet" />
          <Button label="Transfer" tone="quiet" disabled />
        </Row>
      </Stack>
    </Screen>
  );
}
