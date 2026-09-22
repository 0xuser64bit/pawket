import { Columns, Screen } from "@/components/pk";

/**
 * Moving between places holds still. Nothing loops here: no pulsing dots, no
 * shimmering skeletons — just the shape of what is coming, in the same
 * columns the screen will use, with the state said in words for anything
 * that cannot see it.
 *
 * The paw loader belongs to a wait with no known end, not to a navigation
 * the player already asked for.
 */
export default function Loading() {
  return (
    <Screen>
      <div aria-busy="true">
        <p className="pk-sr">Loading</p>
        <div className="pk-screen__bar" aria-hidden="true">
          <div className="pk-well" style={{ height: 40, width: 180 }} />
        </div>
        <Columns
          first={<div className="pk-well pk-loading__scene" aria-hidden="true" />}
          second={
            <div className="pk-stack" style={{ gap: "var(--space-3)" }} aria-hidden="true">
              <div className="pk-well" style={{ height: 14, width: "50%" }} />
              <div className="pk-well" style={{ height: 14, width: "78%" }} />
              <div className="pk-well" style={{ height: 14, width: "64%" }} />
            </div>
          }
        />
      </div>
    </Screen>
  );
}
