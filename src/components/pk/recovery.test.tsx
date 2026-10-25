import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "@/components/pet/share-button";
import { AdoptLink } from "@/components/park/adopt-link";
import { AddressLine } from "@/components/wallet/address";
import { ReadFailure } from "./read-failure";
import { dismissToast, Toasts } from "./toast";

const native = vi.hoisted(() => ({ inApp: false, share: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/native/android", () => ({ inAndroidApp: () => native.inApp, shareLink: native.share, useBackCloses: () => {} }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: native.refresh }) }));

afterEach(() => {
  cleanup();
  for (const id of ["copy-address", "copy-adoption", "share-page"]) dismissToast(id);
  native.inApp = false;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("read and share recovery", () => {
  it("retries the server read from the screen", () => {
    render(<ReadFailure body="The pet could not be read." />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(native.refresh).toHaveBeenCalledOnce();
  });

  it("shows a selectable value on clipboard refusal and clears it on a successful retry", async () => {
    const copy = vi.fn().mockRejectedValueOnce(new Error("Refused")).mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText: copy } });
    render(<><AddressLine value="FullAddressThatMustBeReachable" label="address" /><Toasts /></>);
    fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
    const refused = await screen.findByText("address could not be copied");
    expect(refused.closest(".pk-toast")!.textContent).toContain("FullAddressThatMustBeReachable");
    fireEvent.click(screen.getByRole("button", { name: "Copy address" }));
    await waitFor(() => expect(screen.queryByText("address could not be copied")).toBeNull());
    expect(screen.getByRole("button", { name: "address copied" })).toBeTruthy();
  });

  it("keeps a refused adoption link reachable", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Refused")) } });
    render(<><AdoptLink url="https://pawket.app/adopt" /><Toasts /></>);
    fireEvent.click(screen.getByRole("button", { name: "Share adoption link" }));
    expect(screen.getByText("https://pawket.app/adopt")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Post it on X" }).getAttribute("href")).toContain(encodeURIComponent("https://pawket.app/adopt"));
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect((await screen.findByRole("status")).textContent).toContain("Select the link above");
  });

  it("reports a failed share but leaves an intentional cancellation quiet", async () => {
    const share = vi.fn().mockRejectedValueOnce(new DOMException("Canceled", "AbortError")).mockRejectedValueOnce(new Error("Refused"));
    vi.stubGlobal("navigator", { share });
    render(<><ShareButton name="Pepper" /><Toasts /></>);
    const button = screen.getByRole("button", { name: "Share this record" });
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(screen.queryByText(/could not be shared/)).toBeNull();
    expect(document.querySelector(".pk-toast")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect((await screen.findByRole("status")).textContent).toContain("The link could not be shared");
  });

  it("reports the Android bridge refusing to open a share sheet", async () => {
    native.inApp = true;
    native.share.mockResolvedValue({ ok: false, reason: "no-answer" });
    render(<><ShareButton name="Pepper" /><Toasts /></>);
    fireEvent.click(screen.getByRole("button", { name: "Share this record" }));
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect((await screen.findByRole("status")).textContent).toContain("The share sheet did not open");
    expect(native.share).toHaveBeenCalledWith({ url: window.location.href, title: "Pepper on Pawket" });
  });
});
