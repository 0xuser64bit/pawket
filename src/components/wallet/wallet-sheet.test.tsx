import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WalletSheet } from "./wallet-sheet";

const options = vi.hoisted(() => [{ name: "A wallet with a very long name that must remain readable", icon: "data:image/png;base64," }]);
vi.mock("@solana/kit-plugin-wallet/react", () => ({
  useWallets: () => options,
  useConnect: () => ({ isError: false, isRunning: false, dispatchAsync: () => Promise.resolve() }),
}));
vi.mock("@/lib/solana/use-send", () => ({ useSponsor: () => ({ data: { available: true } }) }));
vi.mock("@/lib/native/android", () => ({ useBackCloses: () => {} }));

afterEach(() => vi.unstubAllGlobals());

it("gives a discovered wallet's complete name the shared wrapping label behavior", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  render(<WalletSheet why="Choose your wallet." onDismiss={() => {}} />);
  const button = screen.getByRole("button", { name: options[0].name });
  expect(screen.getByText(options[0].name)).toHaveClass("pk-btn__label");
  expect(button).toHaveAccessibleName(options[0].name);
});
