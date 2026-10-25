import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HomeScreenTip } from "./home-screen-tip";

const as = (userAgent: string) => vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

it("tells an iPhone's browser how to keep a browser pet, once", () => {
  as("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1");
  const { unmount } = render(<HomeScreenTip name="Miso" />);
  expect(screen.getByText(/Add Pawket to your Home Screen/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(screen.queryByText(/Add Pawket to your Home Screen/)).toBeNull();
  unmount();
  render(<HomeScreenTip name="Miso" />);
  expect(screen.queryByText(/Add Pawket to your Home Screen/)).toBeNull();
});

it("says nothing elsewhere", () => {
  as("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36");
  render(<HomeScreenTip name="Miso" />);
  expect(screen.queryByText(/Home Screen/)).toBeNull();
});
