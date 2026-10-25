import type { ReactNode } from "react";
import { Dock, Mark } from "@/components/pk";
import { RoomButton } from "@/components/market/room-button";
import { WalletChip } from "@/components/wallet/wallet-chip";
import { ResumeSends } from "@/lib/solana/use-send";
import { CareReminderSync } from "@/components/home/remind-me";

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
            <RoomButton />
          </div>
        </div>
      </header>
      <ResumeSends />
      <CareReminderSync />
      {children}
    </>
  );
}
