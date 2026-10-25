import { afterEach, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { BootSplash } from "./boot-splash";

afterEach(() => vi.useRealTimers());

it("lifts away on time even where its fade never ends", () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  const { container } = render(<BootSplash />);
  act(() => vi.advanceTimersByTime(1400));
  expect(container.querySelector(".pk-boot--out")).not.toBeNull();
  act(() => vi.advanceTimersByTime(700));
  expect(container.querySelector(".pk-boot")).toBeNull();
  vi.unstubAllGlobals();
});
