/**
 * Nothing in Pawket loops: no pulsing dots, no shimmering skeletons. A
 * loading screen is the shape of what is coming, held still, with the state
 * said in words for anything that cannot see it.
 */
export default function Loading() {
  return (
    <main className="pk-screen" aria-busy="true">
      <p className="pk-sr">Loading</p>
      <div
        className="pk-well"
        style={{ height: 168, borderRadius: "var(--radius-pocket)" }}
        aria-hidden="true"
      />
      <div className="pk-stack" style={{ gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        <div className="pk-well" style={{ height: 14, width: "50%" }} aria-hidden="true" />
        <div className="pk-well" style={{ height: 14, width: "78%" }} aria-hidden="true" />
      </div>
    </main>
  );
}
