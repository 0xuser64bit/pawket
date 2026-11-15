import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OwnerActions } from "./owner-actions";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/solana/browser-client", () => ({ useConnected: () => ({ account: { address: "owner" } }) }));

beforeEach(() => { window.localStorage.clear(); navigation.push.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });

it("does not leave the Passport when this device cannot save the requested Home pet", () => {
  window.localStorage.setItem("pawket.active-pet", "previous-pet");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage full"); });
  render(<OwnerActions owner="owner" address="requested-pet" name="Mango" />);
  fireEvent.click(screen.getByRole("button", { name: "Care for Mango" }));
  expect(navigation.push).not.toHaveBeenCalled();
  expect(window.localStorage.getItem("pawket.active-pet")).toBe("previous-pet");
  expect(screen.getByRole("alert")).toHaveTextContent(/could not.*home/i);
});

it("opens Home only after the requested pet selection is saved", () => {
  render(<OwnerActions owner="owner" address="requested-pet" name="Mango" />);
  fireEvent.click(screen.getByRole("button", { name: "Care for Mango" }));
  expect(window.localStorage.getItem("pawket.active-pet")).toBe("requested-pet");
  expect(navigation.push).toHaveBeenCalledWith("/home", { transitionTypes: ["nav-place"] });
});
