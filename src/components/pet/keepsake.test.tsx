import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { KeepsakeCard } from "./keepsake";

const OWNER = "4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T";
const mock = vi.hoisted(() => ({ sponsor: { data: undefined } as { data?: { available: boolean } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/lib/solana/browser-client", () => ({ useConnected: () => ({ account: { address: OWNER } }) }));
vi.mock("@/lib/solana/use-send", async (actual) => ({
  ...(await actual<typeof import("@/lib/solana/use-send")>()),
  usePawketSend: () => ({ busy: false }),
  useSponsor: () => mock.sponsor,
}));

const card = () => render(<KeepsakeCard owner={OWNER} pet="pet" name="Pepper" made={false} />);

it("says Pawket pays the card's fee and rent only while it can", () => {
  mock.sponsor = { data: { available: true } };
  card();
  expect(screen.getByText(/Pawket pays the fee and the rent\./)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keep the card" }).getAttribute("aria-disabled")).toBeNull();
});

it("waits, and says so, while Pawket cannot pay them", () => {
  mock.sponsor = { data: { available: false } };
  card();
  expect(screen.queryByText(/Pawket pays/)).toBeNull();
  expect(screen.getByText(/waits until Pawket can cover its fee and rent again/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Keep the card" }).getAttribute("aria-disabled")).toBe("true");
});
