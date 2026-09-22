import { Banner } from "@/components/pk";

/**
 * Honest UI: the product surfaces render fixtures from `src/lib/demo/` while
 * the backend milestones are open. A player must never mistake a fixture for
 * a chain fact, so the note is stated in the neutral `wait` tone — informed,
 * not reassured and not alarmed — and never dressed as a feature.
 */
export function PreviewNote({ what }: { what: string }) {
  return (
    <Banner
      tone="wait"
      title="This is a design preview"
      body={`${what} Nothing on this screen is read from a wallet, a chain or an indexer, and nothing here can be bought.`}
    />
  );
}

/** The same fact, small enough to sit in a screen bar. */
export function PreviewFlag() {
  return (
    <span className="pk-chip pk-chip--paper" title="Most product screens render demo data. A guest pet you adopt is real and lives in this browser.">
      Preview<span className="pk-flag__more"> data</span>
    </span>
  );
}
