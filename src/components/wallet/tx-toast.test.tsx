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
