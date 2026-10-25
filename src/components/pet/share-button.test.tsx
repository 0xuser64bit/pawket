import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ app: false, shareCard: vi.fn(), shareLink: vi.fn(), savePicture: vi.fn() }));
vi.mock("@/lib/native/android", async (original) => ({
  ...(await original<object>()),
  inAndroidApp: () => native.app,
  shareCard: native.shareCard,
  shareLink: native.shareLink,
  savePicture: native.savePicture,
}));
import { ShareButton } from "./share-button";

const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  native.app = false;
});

async function open(share: (data: ShareData) => Promise<void>, canShare: (data: ShareData) => boolean) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } })));
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:card", revokeObjectURL: () => {} }));
  Object.assign(navigator, { share, canShare });
  render(<ShareButton name="Mango" label="Share Mango's record" url="https://pawket.world/pet/abc" image="/pet/abc/opengraph-image" text="Mango, kept on Solana." />);
  fireEvent.click(screen.getByRole("button", { name: "Share Mango's record" }));
  await waitFor(() => expect(screen.getByRole("img", { name: "How the link appears: Mango" })).toBeTruthy());
}

it("shares the record's card itself, its link riding in the words", async () => {
  const share = vi.fn(async () => {});
  await open(share, () => true);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Share" })));
  const [data] = share.mock.calls[0] as unknown as [ShareData];
  expect(data.files?.[0]).toMatchObject({ name: "mango-on-pawket.png", type: "image/png" });
  expect(data.text).toBe("Mango, kept on Solana. https://pawket.world/pet/abc");
});

it("shares the link alone where a browser cannot take a picture", async () => {
  const share = vi.fn(async () => {});
  await open(share, () => false);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Share" })));
  expect(share).toHaveBeenCalledWith({ url: "https://pawket.world/pet/abc", title: "Mango on Pawket", text: "Mango, kept on Solana." });
});

it("in an app from before cards, shares the link alone", async () => {
  native.app = true;
  native.shareCard.mockResolvedValue({ ok: false, reason: "unknown" });
  native.shareLink.mockResolvedValue({ ok: true });
  await open(vi.fn(), () => true);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Share" })));
  await waitFor(() => expect(native.shareLink).toHaveBeenCalledOnce());
  expect(native.shareCard).toHaveBeenCalledWith(expect.objectContaining({ url: "https://pawket.world/pet/abc", data: expect.stringMatching(/^data:image\/png;base64,/) }));
});

it("draws the page's own card, by the name Next gave it, from this origin", async () => {
  const meta = Object.assign(document.createElement("meta"), { content: "https://pawket.world/pet/abc/opengraph-image-1dxcxt?b475" });
  meta.setAttribute("property", "og:image");
  document.head.append(meta);
  const fetched = vi.fn(async () => new Response(png, { headers: { "content-type": "image/png" } }));
  vi.stubGlobal("fetch", fetched);
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:card", revokeObjectURL: () => {} }));
  render(<ShareButton name="Mango" label="Share Mango's record" />);
  fireEvent.click(screen.getByRole("button", { name: "Share Mango's record" }));
  await waitFor(() => expect(screen.getByRole("img", { name: "How the link appears: Mango" })).toBeTruthy());
  expect(fetched).toHaveBeenCalledWith("/pet/abc/opengraph-image-1dxcxt?b475");
  meta.remove();
});
