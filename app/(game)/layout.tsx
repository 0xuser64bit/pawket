import type { ReactNode } from "react";
import { Dock, Mark, ThemeToggle } from "@/components/pk";
import { WalletChip } from "@/components/wallet/wallet-chip";

/**
 * The app shell: the mark, the Dock, and the two facts about this session.
 * The Dock is the only persistent navigation and floats at the foot of the
 * view at every width; the bar scrolls away with the page. See the dock and
 * scaffolding notes in `app/globals.css`.
 *
 * The bar is deliberately small — label-sized type, no hue — because
 * nothing in the shell may outrank the animal on the screen below it.
 */
export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="pk-btn pk-btn--quiet pk-btn--sm pk-skip">
        Skip to content
      </a>
      <header className="pk-shell">
        <div className="pk-shell__bar">
          <Mark href="/home" size={24} type={17} />
          <Dock />
          <div className="pk-shell__aside">
            <WalletChip />
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
