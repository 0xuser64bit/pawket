import { PawLoader } from "@/components/pk";

/**
 * The splash: the mark draws itself and comes alive, and its name follows
 * once the heart has landed.
 *
 * This is the root fallback — the app arriving from cold — which is the one
 * wait in Pawket with no known end. In-app navigation gets the quiet static
 * placeholders in `app/(game)/loading.tsx` instead, because a loop that
 * flashes on every route change is the shimmering-skeleton problem wearing a
 * nicer costume.
 */
export default function Loading() {
  return (
    <main className="pk-splash" aria-busy="true">
      <PawLoader label="Opening Pawket" />
      <p className="pk-mark__name pk-splash__name" aria-hidden="true">
        Pawket
      </p>
    </main>
  );
}
