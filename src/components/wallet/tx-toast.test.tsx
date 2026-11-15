import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dismissToast, showToast, Toasts } from "@/components/pk/toast";
import { txToast } from "./tx-toast";

vi.mock("@/lib/native/android", () => ({ inAndroidApp: () => false }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  act(() => {
    dismissToast("transition");
    vi.runAllTimers();
  });
  vi.useRealTimers();
});

it.each(["sending", "confirming", "confirmed", "unknown", "failed"] as const)("shows the full selectable receipt while %s", (stage) => {
  render(<>{txToast("pending", { stage, signature: "5ig" }, "devnet")!.body}</>);
  const signature = screen.getByText("5ig");
  expect(signature).toHaveAttribute("tabindex", "0");
  expect(signature).toHaveAccessibleName("Transaction signature");
  expect(screen.getByRole("link", { name: "See it on Explorer" }).getAttribute("href")).toContain("5ig");
});

it.each(["Explorer", "signature"] as const)("preserves focused %s when the same toast changes from confirming to confirmed", (control) => {
  render(<Toasts />);
  act(() => showToast(txToast("transition", { stage: "sending", label: "Feed Mango", signature: "5ig" }, "devnet")!));
  const explorer = screen.getByRole("link", { name: "See it on Explorer" });
  const signature = screen.getByRole("group", { name: "Transaction signature" });
  const focused = control === "Explorer" ? explorer : signature;
  act(() => focused.focus());
  expect(focused).toHaveFocus();
  act(() => showToast(txToast("transition", { stage: "confirming", label: "Feed Mango", signature: "5ig" }, "devnet")!));
  expect(focused).toHaveFocus();
  act(() => showToast(txToast("transition", { stage: "confirmed", label: "Feed Mango", signature: "5ig", done: "Fed." }, "devnet")!));
  expect(focused).toHaveFocus();
  expect(screen.getByRole("link", { name: "See it on Explorer" })).toBe(explorer);
  expect(screen.getByRole("group", { name: "Transaction signature" })).toBe(signature);
  expect(document.querySelector(".pk-toast__body")).toHaveTextContent("Fed. Recorded on Solana.");
});

it.each([
  { stage: "unknown" },
  { stage: "failed", error: "It was refused." },
  { stage: "failed", needs: "link", error: "Link your wallet first." },
] as const)("preserves receipt controls when confirming becomes %j", (state) => {
  render(<Toasts />);
  act(() => showToast(txToast("transition", { stage: "confirming", signature: "5ig" }, "devnet")!));
  const explorer = screen.getByRole("link", { name: "See it on Explorer" });
  const signature = screen.getByRole("group", { name: "Transaction signature" });
  act(() => signature.focus());
  act(() => showToast(txToast("transition", { ...state, signature: "5ig" }, "devnet")!));
  expect(signature).toHaveFocus();
  expect(screen.getByRole("link", { name: "See it on Explorer" })).toBe(explorer);
  expect(screen.getByRole("group", { name: "Transaction signature" })).toBe(signature);
});

it.each(["preparing", "signing", "sending", "confirming", "confirmed", "unknown", "failed"] as const)("keeps the %s transaction feedback until deliberate dismissal", (stage) => {
  const toast = txToast("durable", { stage, signature: "5ig" }, "devnet")!;
  expect(toast.persistent).toBe(true);
  expect(toast.ttl).toBeUndefined();
});

it("keeps wallet recovery actions rather than timing them out", () => {
  const toast = txToast("needs-wallet", { stage: "failed", needs: "link", error: "Link your wallet first." }, "devnet")!;
  expect(toast.persistent).toBe(true);
  expect(toast.ttl).toBeUndefined();
});

it("retains a known signature even when a failed state also names wallet recovery", () => {
  render(<>{txToast("needs-wallet", { stage: "failed", needs: "link", signature: "5ig", error: "Link your wallet first." }, "devnet")!.body}</>);
  expect(screen.getByText("5ig")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "See it on Explorer" })).toBeInTheDocument();
});

it("does not invent a fee payer for a legacy recovered receipt", () => {
  render(<>{txToast("legacy", { stage: "confirmed", signature: "5ig" }, "devnet")!.body}</>);
  expect(document.body.textContent).toBe("Recorded on Solana. See it on Explorer5ig");
});

it("says what a send did with its record, and keeps the way to the Explorer", () => {
  const toast = txToast("send-1", { stage: "confirmed", label: "Feed Mango", by: "device", signature: "5ig", done: "Fed. New sticker: First meal." }, "devnet")!;
  expect(toast).toMatchObject({ id: "send-1", tone: "done", title: "Feed Mango" });
  render(<>{toast.body}</>);
  expect(document.body.textContent).toBe("Fed. New sticker: First meal. Recorded on Solana, no pop-up. See it on Explorer5ig");
  expect(screen.getByRole("link", { name: "See it on Explorer" }).getAttribute("href")).toContain("5ig");
});

it("lets a wait on a wallet app on the phone be stopped, and only there", () => {
  const stopped = vi.fn();
  window.addEventListener("pawket:wallet-cancel", stopped);
  render(<>{txToast("send-2", { stage: "signing", label: "Link this app", by: "wallet", phone: true }, "devnet")!.body}</>);
  screen.getByRole("button", { name: "Nothing there? Stop waiting" }).click();
  expect(stopped).toHaveBeenCalledOnce();
  window.removeEventListener("pawket:wallet-cancel", stopped);

  const extension = txToast("send-3", { stage: "signing", label: "Buy the halo", by: "wallet" }, "devnet")!;
  expect(extension.body).toBe("Approve it in your wallet. Nothing is sent until you do.");
});
