import type { ReactNode } from "react";
import { Dock, Mark, ThemeToggle } from "@/components/pk";
import { PreviewFlag } from "@/components/preview-note";

/**
 * The app shell. The Dock is the only persistent navigation and floats 14px
 * from the bottom of the view; every screen leaves 96px of clearance at its
 * foot so the last card never sits under it.
 *
 * The bar above is deliberately small — label-sized type, no hue — because
 * nothing in the shell may outrank the animal on the screen below it.
 */
export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="pk-screen" style={{ paddingBottom: 0 }}>
        <div className="pk-screen__bar">
          <Mark href="/home" size={24} type={17} />
          <div className="pk-row" style={{ gap: "var(--space-2)" }}>
            <PreviewFlag />
            <ThemeToggle />
          </div>
        </div>
      </div>
      {children}
      <Dock />
    </>
  );
}
