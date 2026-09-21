import { Mark, PawLoader } from "@/components/pk";

/**
 * The splash: the mark, and the mark assembling itself underneath it.
 *
 * This is the root fallback — the app arriving from cold — which is the one
 * wait in Pawket with no known end. In-app navigation gets the quiet static
 * placeholders in `app/(game)/loading.tsx` instead, because a loop that
 * flashes on every route change is the shimmering-skeleton problem wearing a
 * nicer costume.
 */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: "var(--space-7)",
        padding: "var(--space-5)",
      }}
    >
      <Mark size={30} type={21} />
      <PawLoader label="Opening Pawket" />
    </main>
  );
}
