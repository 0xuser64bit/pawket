import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { txToast } from "./tx-toast";

vi.mock("@/lib/native/android", () => ({ inAndroidApp: () => false }));

it("says what a send did with its record, and keeps the way to the Explorer", () => {
  const toast = txToast("send-1", { stage: "confirmed", label: "Feed Mango", by: "device", signature: "5ig", done: "Fed. New sticker: First meal." }, "devnet")!;
  expect(toast).toMatchObject({ id: "send-1", tone: "done", title: "Feed Mango" });
  render(<>{toast.body}</>);
  expect(document.body.textContent).toBe("Fed. New sticker: First meal. Recorded on Solana, no pop-up. See it on Explorer");
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
