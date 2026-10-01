import type { Metadata } from "next";
import Link from "next/link";
import { Banner, Card, Chip, EmptyState, ButtonLink, PetFrame, Presence, Screen, ScreenBar, SectionLabel, Stack } from "@/components/pk";
import { CARE_SEEN, MOOD_LABEL, SPECIES_ART, SPECIES_LABEL, SPECIES_SKY } from "@/lib/game/appearance";
import { formatAgo } from "@/lib/utils/format";
import { projectGuestPet, streakAsOf, utcDay } from "@/lib/guest/pet";
import { toCompanionRecord, type PetOnChain } from "@/lib/solana/accounts";
import { getPublicEnv } from "@/config/env";
import { AdoptLink } from "@/components/park/adopt-link";
import { readAllPets } from "@/server/solana";

export const metadata: Metadata = {
  title: "Park",
  description: "Every pet kept on Solana in Pawket, read live from the chain.",
};
export const dynamic = "force-dynamic";

/**
 * Where pets on Solana are seen by everyone: read live from the program,
 * nothing ranked by money because nothing here has a price. Who was out
 * today comes first; then everyone, most cared-for first.
 */
/** The adoption as a Solana Action: the /adopt link unfurls as an adoption card in a Blink-aware client. */
function AdoptAnywhere() {
  const url = new URL("/adopt", getPublicEnv().appUrl).toString();
  return (
    <Card variant="quiet">
      <h2 className="title">Adopt from anywhere</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)", maxWidth: "60ch" }}>
        The adoption page is also a Solana Action. Posted where a Blink-aware wallet is reading — X, with
        Phantom — the link opens as an adoption card, and the pet is adopted straight onto Solana. Pawket
        pays the fee.
      </p>
      <div style={{ marginTop: "var(--space-4)" }}>
        <AdoptLink url={url} />
      </div>
    </Card>
  );
}

export default async function ParkPage() {
  let pets: PetOnChain[];
  try {
    pets = await readAllPets();
  } catch {
    return (
      <Screen>
        <ScreenBar>
          <h1 className="display-l">Park</h1>
        </ScreenBar>
        <Banner
          tone="wait"
          title="Solana did not answer"
          body="Every pet there is unchanged; this page could not read them just now. Reload to ask again."
        />
      </Screen>
    );
  }

  const now = new Date();
  const today = utcDay(now);
  const shown = pets
    .map((entry) => {
      const record = toCompanionRecord(entry);
      return { entry, record, projected: projectGuestPet(record, now), streak: streakAsOf(record.streak, now) };
    })
    .sort((a, b) => b.entry.passport.careCount - a.entry.passport.careCount || b.record.xp - a.record.xp);
  const outToday = shown.filter(({ record }) => record.streak.lastDay === today);
  // Every Passport keeps its last eight cares: together, what just happened in the park.
  const lately = pets
    .flatMap(({ pet, passport }) => passport.recent.map((mark) => ({ pet, ...mark })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Park</h1>
          <p className="caption pk-faint">Every pet kept on Solana, read live</p>
        </div>
        <Chip label={`${pets.length} ${pets.length === 1 ? "pet" : "pets"}`} tone="pool" icon="users" />
      </ScreenBar>

      {pets.length === 0 ? (
        <EmptyState
          icon="users"
          title="Nobody is out yet"
          body="A pet comes to the park once it is kept on Solana. Adopt one, then record it from your room."
          action={<ButtonLink label="Adopt a pet" href="/adopt" icon="paw" />}
        />
      ) : (
        <Stack gap={6}>
          <Card variant="quiet">
            <SectionLabel count={`${outToday.length}`}>Out today</SectionLabel>
            {outToday.length === 0 ? (
              <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
                Nobody has been cared for yet today, in UTC. The first care of the day brings a pet out.
              </p>
            ) : (
              <div className="pk-presences">
                {outToday.map(({ entry, streak }) => (
                  <Link key={entry.pet.address} href={`/pet/${entry.pet.address}`} className="pk-presence-link">
                    <Presence name={entry.pet.name} note={`${streak.count}-day run`} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {lately.length > 0 ? (
            <Card>
              <SectionLabel>Lately</SectionLabel>
              <ul className="pk-log">
                {lately.map((mark) => (
                  <li key={`${mark.pet.address}-${mark.at}-${mark.action}`}>
                    <Link href={`/pet/${mark.pet.address}`} className="pk-feed-link">
                      {CARE_SEEN[mark.action](mark.pet.name)}
                    </Link>
                    <span className="caption pk-faint">{formatAgo(now.getTime() / 1000 - mark.at)}</span>
                  </li>
                ))}
              </ul>
              <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
                Each line is a transaction signed by the pet&apos;s owner.
              </p>
            </Card>
          ) : null}

          <Stack gap={3}>
            <SectionLabel count={`${pets.length}`}>Everyone</SectionLabel>
            <div className="pk-cards">
              {shown.map(({ entry, projected, streak }) => (
                <Card key={entry.pet.address} href={`/pet/${entry.pet.address}`} variant="flush">
                  <div className="pk-card__art">
                    <PetFrame
                      form={SPECIES_ART[entry.pet.species]}
                      sky={SPECIES_SKY[entry.pet.species]}
                      level={projected.level}
                      mood={MOOD_LABEL[projected.mood]}
                      size="fluid"
                      still
                    />
                  </div>
                  <div className="pk-card__body">
                    <h2 className="title" style={{ overflowWrap: "anywhere" }}>{entry.pet.name}</h2>
                    <p className="caption pk-faint">
                      Level {projected.level} · {SPECIES_LABEL[entry.pet.species]}
                    </p>
                    <p className="caption pk-faint">
                      {entry.passport.careCount} {entry.passport.careCount === 1 ? "care" : "cares"}
                      {streak.count > 0 ? ` · ${streak.count}-day run` : ""}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </Stack>

          <AdoptAnywhere />
        </Stack>
      )}
    </Screen>
  );
}
