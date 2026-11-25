import { NavLink as Link } from "@/components/pk/nav-link";
import { PawArt } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { utcDay } from "@/lib/guest/pet";
import { toCompanionRecord } from "@/lib/solana/accounts";
import { readAllPets } from "@/server/solana";
import { sponsorState } from "@/server/sponsor";

export async function LiveStrip() {
  const cluster = getPublicEnv().solanaCluster;
  const readAt = `${String(new Date().getUTCHours()).padStart(2, "0")}:${String(new Date().getUTCMinutes()).padStart(2, "0")}`;
  let figures: Array<{ k: string; v: string; wide?: boolean }> | null = null;

  try {
    const [pets, sponsor] = await Promise.all([readAllPets(), sponsorState().catch(() => null)]);
    const today = utcDay(new Date());
    const out = pets.filter((entry) => toCompanionRecord(entry).streak.lastDay === today).length;
    figures = [
      { k: "Pets kept on Solana", v: String(pets.length) },
      { k: "Cares recorded", v: String(pets.reduce((sum, entry) => sum + entry.passport.careCount, 0)) },
      ...(out > 0 ? [{ k: "Cared for today", v: String(out) }] : []),
      { k: "Network fee", v: sponsor?.available ? "Paid by Pawket" : "A little devnet SOL", wide: true },
    ];
  } catch {
    figures = null;
  }

  if (!figures) {
    return (
      <p className="pk-chainnote__fallback body-sm">
        Solana did not answer just now. The record is unchanged.
      </p>
    );
  }

  return (
    <section className="pk-chainnote" aria-labelledby="pk-chainnote-title">
      <span className="pk-chainnote__stamp" aria-hidden="true">
        <PawArt form="heart" />
        <span>PAWKET</span>
      </span>
      <header className="pk-chainnote__head">
        <h2 id="pk-chainnote-title" className="label">
          On Solana {cluster}, right now
        </h2>
        <span className="receipt-label">Read from the program · {readAt} UTC</span>
      </header>
      <dl className="pk-chainnote__figures">
        {figures.map((figure) => (
          <div key={figure.k} className={figure.wide ? "pk-chainnote__fig pk-chainnote__fig--wide" : "pk-chainnote__fig"}>
            <dt className="receipt-label">{figure.k}</dt>
            <dd className="amount">{figure.v}</dd>
          </div>
        ))}
      </dl>
      <p className="body-sm pk-muted pk-chainnote__foot">
        Guilds, coins, the Market and the rest, counted the same way:{" "}
        <Link href="/pulse">Pawket&apos;s pulse</Link>.
      </p>
    </section>
  );
}
